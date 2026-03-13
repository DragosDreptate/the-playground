/**
 * Backfill du champ isDemo pour les Circles de démo existants en production.
 *
 * Identifie les Circles dont le host principal a un email @demo.playground
 * et met isDemo = true sur ces Circles.
 *
 * Idempotent : ne touche pas les Circles dont isDemo est déjà à true.
 *
 * Usage dev  : pnpm db:backfill-is-demo
 * Usage prod : pnpm db:backfill-is-demo:prod
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
  // Trouve les Circles dont au moins un HOST a un email @demo.playground
  const demoCircles = await prisma.circle.findMany({
    where: {
      isDemo: false,
      memberships: {
        some: {
          role: "HOST",
          user: { email: { endsWith: "@demo.playground" } },
        },
      },
    },
    select: { id: true, name: true, slug: true },
  });

  if (demoCircles.length === 0) {
    console.log("✅ Aucun Circle démo à mettre à jour. Rien à faire.");
    return;
  }

  console.log(`\n🔍 ${demoCircles.length} Circle(s) démo trouvé(s) — backfill en cours...\n`);

  for (const circle of demoCircles) {
    console.log(`  · ${circle.name} (${circle.slug})`);
  }

  const circleIds = demoCircles.map((c) => c.id);

  const result = await prisma.circle.updateMany({
    where: { id: { in: circleIds } },
    data: { isDemo: true },
  });

  console.log(`\n✅ Backfill terminé — ${result.count} Circle(s) mis à jour avec isDemo = true.\n`);
}

main()
  .catch((e) => {
    console.error("❌ Erreur :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
