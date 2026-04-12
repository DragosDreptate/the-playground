/**
 * Ajoute 10 membres supplémentaires à des Communautés existantes
 * et les inscrit à tous leurs événements (PUBLISHED + PAST).
 *
 * Idempotent : safe à relancer, ne duplique pas les données.
 * Tous les utilisateurs utilisent le domaine @demo.playground.
 *
 * Usage dev  : DATABASE_URL=... npx tsx scripts/db-seed-extra-members.ts
 * Usage prod : pnpm db:seed-extra-members:prod
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

// ── Communautés cibles (par slug) ────────────────────────────────────────────

const TARGET_CIRCLE_SLUGS = [
  "women-in-tech-bordeaux",
  "okiwi-software-craftsmanship-bordeaux",
];

// ── 10 nouveaux utilisateurs démo ────────────────────────────────────────────

const NEW_USERS = [
  { key: "camille",   email: "camille@demo.playground",   firstName: "Camille",   lastName: "Vidal" },
  { key: "romain",    email: "romain@demo.playground",    firstName: "Romain",    lastName: "Faure" },
  { key: "manon",     email: "manon@demo.playground",     firstName: "Manon",     lastName: "Roussel" },
  { key: "bastien",   email: "bastien@demo.playground",   firstName: "Bastien",   lastName: "Perrin" },
  { key: "sarah",     email: "sarah@demo.playground",     firstName: "Sarah",     lastName: "Barbier" },
  { key: "valentin",  email: "valentin@demo.playground",  firstName: "Valentin",  lastName: "Caron" },
  { key: "amandine",  email: "amandine@demo.playground",  firstName: "Amandine",  lastName: "Gauthier" },
  { key: "quentin",   email: "quentin@demo.playground",   firstName: "Quentin",   lastName: "Lemoine" },
  { key: "pauline",   email: "pauline@demo.playground",   firstName: "Pauline",   lastName: "Maillard" },
  { key: "florian",   email: "florian@demo.playground",   firstName: "Florian",   lastName: "Brun" },
];

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🌱 Seed membres supplémentaires — The Playground");
  console.log("══════════════════════════════════════════════════\n");

  // 1. Créer/upsert les utilisateurs
  console.log("👤 Utilisateurs...");
  const userMap: Record<string, string> = {};

  for (const { key, email, firstName, lastName } of NEW_USERS) {
    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name: `${firstName} ${lastName}`,
        firstName,
        lastName,
        onboardingCompleted: true,
        emailVerified: new Date(),
        dashboardMode: "PARTICIPANT",
      },
      update: {
        name: `${firstName} ${lastName}`,
        firstName,
        lastName,
        onboardingCompleted: true,
        emailVerified: new Date(),
      },
    });
    userMap[key] = user.id;
    console.log(`  ✓ ${user.email}  →  ${user.name}`);
  }

  const userIds = Object.values(userMap);

  // 2. Pour chaque Communauté cible
  for (const slug of TARGET_CIRCLE_SLUGS) {
    console.log(`\n⭕ Communauté: ${slug}`);

    const circle = await prisma.circle.findUnique({ where: { slug } });
    if (!circle) {
      console.log(`  ⚠️  Communauté "${slug}" non trouvée — ignorée`);
      continue;
    }

    // 2a. Ajouter les 10 utilisateurs comme membres PLAYER
    for (const userId of userIds) {
      await prisma.circleMembership.upsert({
        where: { userId_circleId: { userId, circleId: circle.id } },
        create: { userId, circleId: circle.id, role: "PLAYER", status: "ACTIVE" },
        update: {},
      });
    }
    console.log(`  ✓ ${userIds.length} membres ajoutés`);

    // 2b. Récupérer tous les événements (PUBLISHED + PAST) de cette Communauté
    const moments = await prisma.moment.findMany({
      where: {
        circleId: circle.id,
        status: { in: ["PUBLISHED", "PAST"] },
      },
      orderBy: { startsAt: "asc" },
    });

    if (moments.length === 0) {
      console.log(`  ℹ️  Aucun événement trouvé`);
      continue;
    }

    // 2c. Inscrire les 10 utilisateurs à chaque événement
    let totalRegistrations = 0;
    for (const moment of moments) {
      for (const userId of userIds) {
        await prisma.registration.upsert({
          where: { momentId_userId: { momentId: moment.id, userId } },
          create: {
            momentId: moment.id,
            userId,
            status: "REGISTERED",
            paymentStatus: "NONE",
          },
          update: {},
        });
        totalRegistrations++;
      }
      console.log(`  → ${moment.title} — ${userIds.length} inscrits`);
    }

    console.log(`  ✓ ${totalRegistrations} inscriptions au total (${moments.length} événements × ${userIds.length} membres)`);
  }

  console.log("\n✅ Membres supplémentaires injectés avec succès.\n");
}

main()
  .catch((e) => {
    console.error("\n❌ Erreur :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
