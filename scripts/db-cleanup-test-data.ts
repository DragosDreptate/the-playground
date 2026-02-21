/**
 * Supprime toutes les données de test (@test.playground) de la base de données.
 * Utilisable en dev (via .env.local) et en prod (via DATABASE_URL injecté par le script shell).
 *
 * Par défaut : mode dry-run (affiche ce qui serait supprimé, sans toucher à la DB).
 * Passer --execute pour effectuer la suppression réelle.
 *
 * Usage dev  : pnpm db:cleanup-test-data
 * Usage dev  : pnpm db:cleanup-test-data --execute
 * Usage prod : pnpm db:cleanup-test-data:prod  (passe par db-cleanup-test-data-prod.sh)
 */

import { config } from "dotenv";
config({ path: ".env.local" }); // Sans effet si DATABASE_URL est déjà défini dans l'environnement

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL non défini.");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
});

const DRY_RUN = !process.argv.includes("--execute");
const TEST_DOMAIN = "@test.playground";

async function main() {
  console.log("\n🧹 Nettoyage données test — The Playground");
  console.log("══════════════════════════════════════════\n");

  if (DRY_RUN) {
    console.log("⚠️  Mode DRY-RUN — aucune donnée ne sera supprimée.");
    console.log("   Passer --execute pour effectuer la suppression réelle.\n");
  } else {
    console.log("🔴 Mode EXECUTE — suppression réelle des données de test.\n");
  }

  // 1. Utilisateurs test
  const testUsers = await prisma.user.findMany({
    where: { email: { endsWith: TEST_DOMAIN } },
    select: { id: true, email: true, name: true },
  });

  if (testUsers.length === 0) {
    console.log("✅ Aucun utilisateur test trouvé. Base déjà propre.\n");
    return;
  }

  console.log(`👤 Utilisateurs test trouvés (${testUsers.length}) :`);
  for (const u of testUsers) {
    console.log(`   - ${u.email}  (${u.name})`);
  }

  // 2. Circles créés par des utilisateurs test (les Moments, Registrations,
  //    Comments et Memberships sont supprimés en cascade via le schema Prisma)
  const testUserIds = testUsers.map((u) => u.id);

  const testCircles = await prisma.circle.findMany({
    where: {
      memberships: {
        some: {
          userId: { in: testUserIds },
          role: "HOST",
        },
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: {
        select: {
          moments: true,
          memberships: true,
        },
      },
    },
  });

  console.log(`\n⭕ Circles test trouvés (${testCircles.length}) :`);
  for (const c of testCircles) {
    console.log(
      `   - ${c.name} (${c.slug}) — ${c._count.moments} Moments, ${c._count.memberships} membres`
    );
  }

  if (DRY_RUN) {
    console.log("\n──────────────────────────────────────────");
    console.log("Résumé de ce qui serait supprimé :");
    console.log(`  • ${testCircles.length} Circle(s) et leurs Moments/Registrations/Comments`);
    console.log(`  • ${testUsers.length} utilisateur(s) test`);
    console.log("\nRelancer avec --execute pour effectuer la suppression.\n");
    return;
  }

  // 3. Suppression réelle (ordre important : évite les violations de FK)
  console.log("\n🗑️  Suppression en cours...\n");

  const testCircleIds = testCircles.map((c) => c.id);

  if (testCircleIds.length > 0) {
    // Comments sur les Moments de ces Circles
    const deletedComments = await prisma.comment.deleteMany({
      where: { moment: { circleId: { in: testCircleIds } } },
    });
    console.log(`  ✓ ${deletedComments.count} commentaire(s) supprimé(s)`);

    // Registrations sur les Moments de ces Circles
    const deletedRegistrations = await prisma.registration.deleteMany({
      where: { moment: { circleId: { in: testCircleIds } } },
    });
    console.log(`  ✓ ${deletedRegistrations.count} inscription(s) supprimée(s)`);

    // Moments
    const deletedMoments = await prisma.moment.deleteMany({
      where: { circleId: { in: testCircleIds } },
    });
    console.log(`  ✓ ${deletedMoments.count} Moment(s) supprimé(s)`);

    // Memberships
    const deletedMemberships = await prisma.circleMembership.deleteMany({
      where: { circleId: { in: testCircleIds } },
    });
    console.log(`  ✓ ${deletedMemberships.count} membership(s) supprimée(s)`);

    // Circles
    const deletedCircles = await prisma.circle.deleteMany({
      where: { id: { in: testCircleIds } },
    });
    console.log(`  ✓ ${deletedCircles.count} Circle(s) supprimé(s)`);
  }

  // Supprimer aussi les memberships dans des Circles non-test (ex: invitations croisées)
  const residualMemberships = await prisma.circleMembership.deleteMany({
    where: { userId: { in: testUserIds } },
  });
  if (residualMemberships.count > 0) {
    console.log(`  ✓ ${residualMemberships.count} membership(s) résiduelle(s) supprimée(s)`);
  }

  // Utilisateurs test
  const deletedUsers = await prisma.user.deleteMany({
    where: { email: { endsWith: TEST_DOMAIN } },
  });
  console.log(`  ✓ ${deletedUsers.count} utilisateur(s) supprimé(s)`);

  console.log("\n✅ Nettoyage terminé avec succès.\n");
}

main()
  .catch((e) => {
    console.error("\n❌ Erreur :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
