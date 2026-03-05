import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

export { Prisma };

/**
 * Driver WebSocket Pool (PrismaNeon / @neondatabase/serverless)
 *
 * PrismaNeon utilise @neondatabase/serverless en mode Pool (WebSocket persistant),
 * compatible Vercel Serverless (Node.js) et Vercel Edge.
 * Supporte $transaction interactif, $queryRaw et $executeRaw.
 *
 * pipelineConnect="password" est le défaut de @neondatabase/serverless — pipeline
 * le handshake auth WebSocket (2 round-trips → 1), déjà actif sans configuration.
 *
 * Rollback : réactiver PrismaPg (TCP) via @prisma/adapter-pg si nécessaire.
 */
function createClient(): PrismaClient {
  const adapter = new PrismaNeon(
    {
      connectionString: process.env.DATABASE_URL!,
      max: 5,                         // ≤ 10 recommandé par Neon pour les fonctions serverless
      idleTimeoutMillis: 30_000,      // Ferme les connexions idle avant l'idle timeout Neon (~5min)
      connectionTimeoutMillis: 5_000, // Fail fast si le Pool ne peut pas allouer une connexion
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

// Extension : log structuré JSON de chaque query >100ms → Vercel Function Logs
export const prisma = _baseClient.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const start = performance.now();
        try {
          return await query(args);
        } finally {
          const duration = Math.round(performance.now() - start);
          if (duration > 100) {
            console.warn(
              JSON.stringify({
                level: "warn",
                type: "slow_query",
                model,
                operation,
                duration,
              })
            );
          }
        }
      },
    },
  },
});
