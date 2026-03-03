/**
 * Abonne tous les utilisateurs @demo.playground au Circle "the-spark" (PLAYER).
 * Idempotent — safe à relancer.
 *
 * Usage dev  : DATABASE_URL=... npx tsx scripts/db-subscribe-demo-to-the-spark.ts
 * Usage prod : pnpm db:subscribe-demo-to-the-spark:prod
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL non défini.");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const circle = await prisma.circle.findUnique({ where: { slug: "the-spark" } });
  if (!circle) {
    console.error("❌ Circle 'the-spark' introuvable.");
    process.exit(1);
  }
  console.log(`✓ Circle trouvé : ${circle.name} (${circle.id})`);

  const demoUsers = await prisma.user.findMany({
    where: { email: { endsWith: "@demo.playground" } },
    select: { id: true, email: true },
  });
  console.log(`✓ ${demoUsers.length} utilisateurs @demo.playground trouvés`);

  let created = 0;
  let skipped = 0;

  for (const user of demoUsers) {
    const existing = await prisma.circleMembership.findUnique({
      where: { userId_circleId: { userId: user.id, circleId: circle.id } },
    });
    if (existing) {
      skipped++;
    } else {
      await prisma.circleMembership.create({
        data: { userId: user.id, circleId: circle.id, role: "PLAYER" },
      });
      created++;
      console.log(`  + ${user.email}`);
    }
  }

  console.log(`\n✅ Terminé — ${created} abonnements créés, ${skipped} déjà existants`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
