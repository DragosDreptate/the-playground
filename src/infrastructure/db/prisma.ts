import { PrismaClient, Prisma } from "@prisma/client";

export { Prisma };
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});

// Singleton du client de base (déduplication HMR en dev)
const _baseClient: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

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
