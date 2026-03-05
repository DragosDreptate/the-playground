import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

export { Prisma };

/**
 * Protocole de connexion à Neon :
 *
 *   PRISMA_USE_HTTP_ADAPTER=true  → HTTP (@prisma/adapter-neon)
 *                                   Requis sur Vercel Edge (V8 isolates, pas de TCP)
 *                                   Rollback immédiat : ajouter cette var dans Vercel
 *
 *   (non défini, défaut)          → TCP standard via pooler Neon
 *                                   Connexion persistante sur les fonctions Vercel Serverless
 *                                   ~15ms/query vs ~120ms/query en HTTP
 */
function createClient(): PrismaClient {
  if (process.env.PRISMA_USE_HTTP_ADAPTER === "true") {
    const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
    return new PrismaClient({ adapter });
  }
  // TCP standard via pooler Neon — Prisma 7 lit DATABASE_URL automatiquement
  return new PrismaClient();
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
