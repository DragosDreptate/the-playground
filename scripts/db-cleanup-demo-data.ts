/**
 * Supprime toutes les données de démo (@demo.playground) de la base de données.
 * Utilisable en dev (via .env.local) et en prod (via DATABASE_URL injecté par le script shell).
 *
 * Par défaut : mode dry-run (affiche ce qui serait supprimé, sans toucher à la DB).
 * Passer --execute pour effectuer la suppression réelle.
 *
 * Ordre de suppression (respecte les contraintes FK du schema) :
 *
 *   1. Moments créés par les utilisateurs démo (partout, pas seulement dans les Circles démo)
 *      → DOIT être fait en premier car Moment.createdById n'a pas de onDelete:Cascade
 *      → Cascade automatique : Registrations + Comments sur ces Moments
 *
 *   2. Circles hostés par des utilisateurs démo
 *      → Cascade automatique : Moments résiduels (créés par de vrais users dans un Circle démo)
 *        + leurs Registrations/Comments + CircleMemberships
 *
 *   3. Utilisateurs démo
 *      → Cascade automatique (défini dans le schema) :
 *        Account, Session, CircleMembership (circles non-démo), Registration (moments non-démo),
 *        Comment (moments non-démo)
 *
 * Usage dev  : pnpm db:cleanup-demo-data            (dry-run)
 * Usage dev  : pnpm db:cleanup-demo-data --execute  (suppression réelle)
 * Usage prod : pnpm db:cleanup-demo-data:prod        (passe par db-cleanup-demo-data-prod.sh)
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
const DEMO_DOMAIN = "@demo.playground";

async function main() {
  console.log("\n🧹 Nettoyage données démo — The Playground");
  console.log("══════════════════════════════════════════\n");

  if (DRY_RUN) {
    console.log("⚠️  Mode DRY-RUN — aucune donnée ne sera supprimée.");
    console.log("   Passer --execute pour effectuer la suppression réelle.\n");
  } else {
    console.log("🔴 Mode EXECUTE — suppression réelle des données de démo.\n");
  }

  // ── Inventaire ─────────────────────────────────────────────────────────────

  const demoUsers = await prisma.user.findMany({
    where: { email: { endsWith: DEMO_DOMAIN } },
    select: { id: true, email: true, name: true },
  });

  if (demoUsers.length === 0) {
    console.log("✅ Aucun utilisateur démo trouvé. Base déjà propre.\n");
    return;
  }

  const demoUserIds = demoUsers.map((u) => u.id);

  console.log(`👤 Utilisateurs démo (${demoUsers.length}) :`);
  for (const u of demoUsers) {
    console.log(`   - ${u.email}  (${u.name ?? "—"})`);
  }

  // Moments créés par des utilisateurs démo (tous Circles confondus)
  const demoMoments = await prisma.moment.findMany({
    where: { createdById: { in: demoUserIds } },
    select: { id: true, title: true, circle: { select: { name: true } } },
  });

  console.log(`\n📅 Moments créés par des utilisateurs démo (${demoMoments.length}) :`);
  for (const m of demoMoments) {
    console.log(`   - "${m.title}" (Circle : ${m.circle.name})`);
  }

  // Circles où un utilisateur démo est HOST
  const demoCircles = await prisma.circle.findMany({
    where: {
      memberships: { some: { userId: { in: demoUserIds }, role: "HOST" } },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { moments: true, memberships: true } },
    },
  });

  console.log(`\n⭕ Circles démo (${demoCircles.length}) :`);
  for (const c of demoCircles) {
    console.log(
      `   - ${c.name} (${c.slug}) — ${c._count.moments} Moments, ${c._count.memberships} membres`
    );
  }

  if (DRY_RUN) {
    // Compter les données qui casaderaient mais ne sont pas encore listées
    const demoMomentIds = demoMoments.map((m) => m.id);
    const demoCircleIds = demoCircles.map((c) => c.id);

    const [regOnDemoMoments, commentOnDemoMoments, membershipsInDemoCircles] =
      await Promise.all([
        prisma.registration.count({ where: { momentId: { in: demoMomentIds } } }),
        prisma.comment.count({ where: { momentId: { in: demoMomentIds } } }),
        prisma.circleMembership.count({ where: { circleId: { in: demoCircleIds } } }),
      ]);

    console.log("\n──────────────────────────────────────────");
    console.log("Résumé de ce qui serait supprimé :");
    console.log(
      `  • ${demoMoments.length} Moment(s) créé(s) par des utilisateurs démo`
    );
    console.log(
      `    └─ ${regOnDemoMoments} inscription(s) + ${commentOnDemoMoments} commentaire(s) liés`
    );
    console.log(
      `  • ${demoCircles.length} Circle(s) démo (et leurs Moments/Memberships résiduels)`
    );
    console.log(
      `    └─ ${membershipsInDemoCircles} membership(s) dans ces Circles`
    );
    console.log(`  • ${demoUsers.length} utilisateur(s) démo`);
    console.log(
      `    └─ Leurs comptes, sessions, et inscriptions dans des Circles non-démo cascadent automatiquement`
    );
    console.log("\nRelancer avec --execute pour effectuer la suppression.\n");
    return;
  }

  // ── Suppression réelle ─────────────────────────────────────────────────────
  console.log("\n🗑️  Suppression en cours...\n");

  // ÉTAPE 1 — Moments créés par des utilisateurs démo (partout)
  // Obligatoire EN PREMIER : Moment.createdById n'a pas de onDelete:Cascade.
  // Cascade automatique → Registrations + Comments de ces Moments.
  const deletedMoments = await prisma.moment.deleteMany({
    where: { createdById: { in: demoUserIds } },
  });
  console.log(
    `  ✓ Étape 1 : ${deletedMoments.count} Moment(s) supprimé(s) (+ inscriptions et commentaires associés via cascade)`
  );

  // ÉTAPE 2 — Circles démo
  // Cascade automatique → Moments résiduels + leurs Registrations/Comments + CircleMemberships.
  const demoCircleIds = demoCircles.map((c) => c.id);
  if (demoCircleIds.length > 0) {
    const deletedCircles = await prisma.circle.deleteMany({
      where: { id: { in: demoCircleIds } },
    });
    console.log(
      `  ✓ Étape 2 : ${deletedCircles.count} Circle(s) supprimé(s) (+ Moments résiduels, inscriptions, commentaires, memberships via cascade)`
    );
  } else {
    console.log("  ✓ Étape 2 : aucun Circle démo à supprimer");
  }

  // ÉTAPE 3 — Utilisateurs démo
  // Cascade automatique (défini dans le schema) :
  //   Account, Session, CircleMembership (circles non-démo),
  //   Registration (Moments dans des Circles non-démo), Comment (idem).
  const deletedUsers = await prisma.user.deleteMany({
    where: { email: { endsWith: DEMO_DOMAIN } },
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
