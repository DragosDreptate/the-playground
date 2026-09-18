/**
 * Jeu de données PUBLIQUES pour la suite E2E — communauté visible de l'Explorer.
 *
 * Pourquoi un script à part plutôt qu'un ajout à `db-seed-test-data.ts` :
 * ce dernier possède une variante `:prod`, donc tout ce qu'on y ajoute finit
 * un jour en production. Ces données-ci ne doivent JAMAIS y aller.
 *
 * Pourquoi il existe : `excludeTestHostFilter` masque de l'Explorer toute
 * communauté dont l'hôte est en `@test.playground`. Aucune donnée de test ne
 * pouvait donc apparaître sur la page Découvrir, et les tests correspondants se
 * rabattaient en silence sur ce qui traînait dans la base de développement.
 * Les comptes `@e2e.playground` ne sont pas masqués : ils fournissent la
 * matière qui manquait, sans relâcher le filtre.
 *
 * Idempotent, et toutes les dates sont RELATIVES : ce jeu ne vieillit pas.
 *
 * Usage : appelé par `tests/e2e/global-setup.ts`. Jamais en production.
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

const E2E_SUFFIX = "@e2e.playground";

const HOST = {
  email: `host${E2E_SUFFIX}`,
  firstName: "Camille",
  lastName: "Explorer",
};

export const E2E_PUBLIC_CIRCLE_SLUG = "e2e-communaute-publique";

/** Dates relatives : le jeu reste valide quelle que soit la date d'exécution. */
function daysFromNow(days: number, hour: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

const MOMENTS = [
  { slug: "e2e-public-moment-proche", title: "Rencontre mensuelle E2E", days: 7, hour: 19 },
  { slug: "e2e-public-moment-median", title: "Atelier découverte E2E", days: 21, hour: 18 },
  { slug: "e2e-public-moment-lointain", title: "Rendez-vous trimestriel E2E", days: 45, hour: 14 },
];

async function main() {
  const host = await prisma.user.upsert({
    where: { email: HOST.email },
    update: {},
    create: {
      email: HOST.email,
      name: `${HOST.firstName} ${HOST.lastName}`,
      firstName: HOST.firstName,
      lastName: HOST.lastName,
      emailVerified: new Date(),
      onboardingCompleted: true,
    },
  });

  const circle = await prisma.circle.upsert({
    where: { slug: E2E_PUBLIC_CIRCLE_SLUG },
    update: { visibility: "PUBLIC", excludedFromExplorer: false },
    create: {
      slug: E2E_PUBLIC_CIRCLE_SLUG,
      name: "Communauté publique E2E",
      description:
        "Communauté publique dédiée aux tests de la page Découvrir. " +
        "Elle porte toujours des événements à venir, quelle que soit la date.",
      visibility: "PUBLIC",
      excludedFromExplorer: false,
      category: "TECH",
      city: "Paris",
    },
  });

  await prisma.circleMembership.upsert({
    where: { userId_circleId: { userId: host.id, circleId: circle.id } },
    update: { role: "HOST" },
    create: { userId: host.id, circleId: circle.id, role: "HOST" },
  });

  for (const m of MOMENTS) {
    const startsAt = daysFromNow(m.days, m.hour);
    await prisma.moment.upsert({
      where: { slug: m.slug },
      // Les dates sont recalculées à chaque exécution : c'est ce qui empêche
      // ce jeu de données de périmer.
      update: { startsAt, status: "PUBLISHED" },
      create: {
        slug: m.slug,
        circleId: circle.id,
        createdById: host.id,
        title: m.title,
        description: "Événement public de la suite E2E, toujours à venir.",
        startsAt,
        locationType: "IN_PERSON",
        locationName: "Paris",
        locationAddress: "Paris, France",
        status: "PUBLISHED",
      },
    });
  }

  console.log(
    `✅ Seed E2E public : ${circle.slug} + ${MOMENTS.length} événements à venir ` +
      `(${MOMENTS.map((m) => `J+${m.days}`).join(", ")})`
  );
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("❌ Seed E2E public :", e);
  await prisma.$disconnect();
  process.exit(1);
});
