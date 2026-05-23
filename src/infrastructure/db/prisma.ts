import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import {
  BASE_DELAY_MS,
  MAX_RETRIES,
  READ_OPERATIONS,
  describeDbError,
  isTransientError,
  sleep,
} from "./retry-policy";

export { Prisma };

// ---------------------------------------------------------------------------
// Driver WebSocket Pool (PrismaNeon / @neondatabase/serverless)
// ---------------------------------------------------------------------------

function createClient(): PrismaClient {
  const adapter = new PrismaNeon(
    {
      connectionString: process.env.DATABASE_URL!,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 15_000,
    },
    {
      onPoolError: (err) => {
        console.error(
          JSON.stringify({
            level: "error",
            type: "pool_error",
            message: describeDbError(err),
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
                  error: describeDbError(error),
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
                  error: describeDbError(error),
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
