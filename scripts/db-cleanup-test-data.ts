/**
 * Supprime toutes les données de test (@test.playground) de la base de données.
 * Utilisable en dev (via .env.local) et en prod (via DATABASE_URL injecté par le script shell).
 *
 * Par défaut : mode dry-run (affiche ce qui serait supprimé, sans toucher à la DB).
 * Passer --execute pour effectuer la suppression réelle.
 *
 * Ordre de suppression (respecte les contraintes FK du schema) :
 *
 *   1. Moments créés par les utilisateurs test (partout, pas seulement dans les Circles test)
 *      → DOIT être fait en premier car Moment.createdById n'a pas de onDelete:Cascade
 *      → Cascade automatique : Registrations + Comments sur ces Moments
 *
 *   2. Circles hostés par des utilisateurs test
 *      → Cascade automatique : Moments résiduels (créés par de vrais users dans un Circle test)
 *        + leurs Registrations/Comments + CircleMemberships
 *
 *   3. Utilisateurs test
 *      → Cascade automatique (défini dans le schema) :
 *        Account, Session, CircleMembership (circles non-test), Registration (moments non-test),
 *        Comment (moments non-test)
 *
 * Usage dev  : pnpm db:cleanup-test-data            (dry-run)
 * Usage dev  : pnpm db:cleanup-test-data --execute  (suppression réelle)
 * Usage prod : pnpm db:cleanup-test-data:prod        (passe par db-cleanup-test-data-prod.sh)
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

  // ── Inventaire ────────────────────────────────────────────────────────────

  const testUsers = await prisma.user.findMany({
    where: { email: { endsWith: TEST_DOMAIN } },
    select: { id: true, email: true, name: true },
  });

  if (testUsers.length === 0) {
    console.log("✅ Aucun utilisateur test trouvé. Base déjà propre.\n");
    return;
  }

  const testUserIds = testUsers.map((u) => u.id);

  console.log(`👤 Utilisateurs test (${testUsers.length}) :`);
  for (const u of testUsers) {
    console.log(`   - ${u.email}  (${u.name ?? "—"})`);
  }

  // Moments créés par des utilisateurs test (tous Circles confondus)
  const testMoments = await prisma.moment.findMany({
    where: { createdById: { in: testUserIds } },
    select: { id: true, title: true, circle: { select: { name: true } } },
  });

  console.log(`\n📅 Moments créés par des utilisateurs test (${testMoments.length}) :`);
  for (const m of testMoments) {
    console.log(`   - "${m.title}" (Circle : ${m.circle.name})`);
  }

  // Circles où un utilisateur test est HOST
  const testCircles = await prisma.circle.findMany({
    where: {
      memberships: { some: { userId: { in: testUserIds }, role: "HOST" } },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { moments: true, memberships: true } },
    },
  });

  console.log(`\n⭕ Circles test (${testCircles.length}) :`);
  for (const c of testCircles) {
    console.log(
      `   - ${c.name} (${c.slug}) — ${c._count.moments} Moments, ${c._count.memberships} membres`
    );
  }

  if (DRY_RUN) {
    // Compter les données qui casaderaient mais ne sont pas encore listées
    const testMomentIds = testMoments.map((m) => m.id);
    const testCircleIds = testCircles.map((c) => c.id);

    const [regOnTestMoments, commentOnTestMoments, membershipsInTestCircles] =
      await Promise.all([
        prisma.registration.count({ where: { momentId: { in: testMomentIds } } }),
        prisma.comment.count({ where: { momentId: { in: testMomentIds } } }),
        prisma.circleMembership.count({ where: { circleId: { in: testCircleIds } } }),
      ]);

    console.log("\n──────────────────────────────────────────");
    console.log("Résumé de ce qui serait supprimé :");
    console.log(
      `  • ${testMoments.length} Moment(s) créé(s) par des utilisateurs test`
    );
    console.log(
      `    └─ ${regOnTestMoments} inscription(s) + ${commentOnTestMoments} commentaire(s) liés`
    );
    console.log(
      `  • ${testCircles.length} Circle(s) test (et leurs Moments/Memberships résiduels)`
    );
    console.log(
      `    └─ ${membershipsInTestCircles} membership(s) dans ces Circles`
    );
    console.log(`  • ${testUsers.length} utilisateur(s) test`);
    console.log(
      `    └─ Leurs comptes, sessions, et inscriptions dans des Circles non-test cascadent automatiquement`
    );
    console.log("\nRelancer avec --execute pour effectuer la suppression.\n");
    return;
  }

  // ── Suppression réelle ────────────────────────────────────────────────────
  console.log("\n🗑️  Suppression en cours...\n");

  // ÉTAPE 1 — Moments créés par des utilisateurs test (partout)
  // Obligatoire EN PREMIER : Moment.createdById n'a pas de onDelete:Cascade.
  // Deleting the user without this step would violate the FK constraint.
  // Cascade automatique → Registrations + Comments de ces Moments.
  const deletedMoments = await prisma.moment.deleteMany({
    where: { createdById: { in: testUserIds } },
  });
  console.log(
    `  ✓ Étape 1 : ${deletedMoments.count} Moment(s) supprimé(s) (+ inscriptions et commentaires associés via cascade)`
  );

  // ÉTAPE 2 — Circles test
  // Cascade automatique → Moments résiduels (créés par de vrais users dans un Circle test)
  //   + leurs Registrations/Comments + CircleMemberships.
  const testCircleIds = testCircles.map((c) => c.id);
  if (testCircleIds.length > 0) {
    const deletedCircles = await prisma.circle.deleteMany({
      where: { id: { in: testCircleIds } },
    });
    console.log(
      `  ✓ Étape 2 : ${deletedCircles.count} Circle(s) supprimé(s) (+ Moments résiduels, inscriptions, commentaires, memberships via cascade)`
    );
  } else {
    console.log("  ✓ Étape 2 : aucun Circle test à supprimer");
  }

  // ÉTAPE 3 — Utilisateurs test
  // Cascade automatique (défini dans le schema) :
  //   Account, Session, CircleMembership (circles non-test),
  //   Registration (Moments dans des Circles non-test), Comment (idem).
  const deletedUsers = await prisma.user.deleteMany({
    where: { email: { endsWith: TEST_DOMAIN } },
  });
  console.log(
    `  ✓ Étape 3 : ${deletedUsers.count} utilisateur(s) supprimé(s) (+ comptes OAuth, sessions, et données résiduelles via cascade)`
  );

  console.log("\n✅ Nettoyage terminé avec succès.\n");
}

main()
  .catch((e) => {
    console.error("\n❌ Erreur :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
