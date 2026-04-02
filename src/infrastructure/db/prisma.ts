import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

export { Prisma };

// ---------------------------------------------------------------------------
// Retry — erreurs de connexion transitoires Neon
// ---------------------------------------------------------------------------

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 100;

const TRANSIENT_PATTERNS = [
  "Connection terminated unexpectedly",
  "Connection terminated due to connection timeout",
  "Connection refused",
  "connection timed out",
  "too many connections",
  "socket hang up",
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENOTFOUND",
];

// Prisma error codes for connection issues
const TRANSIENT_PRISMA_CODES = new Set([
  "P1008", // Operations timed out
  "P1011", // Error opening a TLS connection
  "P1015", // Can't reach database server
  "P1017", // Server has closed the connection
  "P2024", // Timed out fetching a new connection from the pool
]);

// Opérations de lecture — safe to retry (idempotentes par nature)
const READ_OPERATIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);

function isTransientError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return TRANSIENT_PRISMA_CODES.has(error.code);
  }
  const message = error instanceof Error ? error.message : String(error);
  return TRANSIENT_PATTERNS.some((p) => message.includes(p));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Driver WebSocket Pool (PrismaNeon / @neondatabase/serverless)
// ---------------------------------------------------------------------------

function createClient(): PrismaClient {
  const adapter = new PrismaNeon(
    {
      connectionString: process.env.DATABASE_URL!,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    },
    {
      onPoolError: (err) => {
        console.error(
          JSON.stringify({
            level: "error",
            type: "pool_error",
            message: err.message,
          })
        );
      },
    }
  );
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Singleton — déduplication HMR en dev
const _baseClient: PrismaClient = globalForPrisma.prisma ?? createClient();
globalForPrisma.prisma = _baseClient;

// Extension : retry connexions transitoires (reads only) + log slow queries
export const prisma = _baseClient.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const start = performance.now();
        const canRetry = READ_OPERATIONS.has(operation);
        let lastError: unknown;

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          try {
            const result = await query(args);
            const duration = Math.round(performance.now() - start);
            if (duration > 100) {
              console.warn(
                JSON.stringify({
                  level: "warn",
                  type: "slow_query",
                  model,
                  operation,
                  duration,
                  ...(attempt > 0 && { retries: attempt }),
                })
              );
            }
            return result;
          } catch (error) {
            lastError = error;

            if (canRetry && attempt < MAX_RETRIES && isTransientError(error)) {
              const delay = BASE_DELAY_MS * 2 ** attempt; // 100, 200, 400ms
              console.warn(
                JSON.stringify({
                  level: "warn",
                  type: "db_retry",
                  model,
                  operation,
                  attempt: attempt + 1,
                  delay,
                  error: error instanceof Error ? error.message : String(error),
                })
              );
              await sleep(delay);
              continue;
            }

            // Log durée totale pour les requêtes qui échouent définitivement
            const duration = Math.round(performance.now() - start);
            if (duration > 100) {
              console.warn(
                JSON.stringify({
                  level: "warn",
                  type: "slow_query_failed",
                  model,
                  operation,
                  duration,
                  ...(attempt > 0 && { retries: attempt }),
                  error: error instanceof Error ? error.message : String(error),
                })
              );
            }
            throw error;
          }
        }

        // Unreachable en pratique — garde défensive
        throw lastError ?? new Error("Unexpected retry exhaustion");
      },
    },
  },
});
