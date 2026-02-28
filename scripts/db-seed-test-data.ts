/**
 * Injecte des données de test réalistes dans la base de données.
 * Utilisable en dev (via .env.local) et en prod (via DATABASE_URL injecté par le script shell).
 *
 * Idempotent : safe à relancer, ne duplique pas les données.
 * Tous les utilisateurs utilisent le domaine @test.playground (convention pérenne).
 *
 * Usage dev  : pnpm db:seed-test-data
 * Usage prod : pnpm db:seed-test-data:prod  (passe par db-seed-test-data-prod.sh)
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

// ── Utilisateurs test ────────────────────────────────────────────────────────

const USERS = [
  { key: "host",    email: "host@test.playground",    firstName: "Alice",   lastName: "Martin",   dashboardMode: "ORGANIZER" as const },
  { key: "player1", email: "player1@test.playground", firstName: "Thomas",  lastName: "Dubois",   dashboardMode: "PARTICIPANT" as const },
  { key: "player2", email: "player2@test.playground", firstName: "Camille", lastName: "Bernard",  dashboardMode: "PARTICIPANT" as const },
  { key: "player3", email: "player3@test.playground", firstName: "Lucas",   lastName: "Petit",    dashboardMode: "PARTICIPANT" as const },
  { key: "player4", email: "player4@test.playground", firstName: "Manon",   lastName: "Rousseau", dashboardMode: "PARTICIPANT" as const },
];

// ── Données réalistes ────────────────────────────────────────────────────────

const SEED_DATA = [
  {
    // ── Circle 1 : tech ──────────────────────────────────────────────────────
    slug: "paris-creative-tech",
    name: "Paris Creative Tech",
    description:
      "Communauté de développeurs et créatifs parisiens passionnés par les nouvelles technologies. " +
      "Meetups mensuels, workshops pratiques et hackathons. Bonne ambiance garantie.",
    visibility: "PUBLIC" as const,
    moments: [
      {
        slug: "test-soiree-js-pizza",
        title: "Soirée JS & Pizza",
        description:
          "Une soirée décontractée autour de JavaScript ! Au programme : deux lightning talks " +
          "(React Server Components et Bun vs Node.js), pizza party et networking. " +
          "Tous niveaux bienvenus, venez nombreux !",
        startsAt: new Date("2026-01-15T19:00:00"),
        endsAt: new Date("2026-01-15T22:00:00"),
        locationType: "IN_PERSON" as const,
        locationName: "Le Wagon Paris",
        locationAddress: "16 Villa Gaudelet, 75011 Paris",
        capacity: 40,
        status: "PAST" as const,
        registrations: ["host", "player1", "player2", "player3", "player4"],
        comments: [
          { user: "player1", content: "Super soirée, merci pour l'organisation ! À refaire absolument." },
          { user: "player2", content: "J'ai adoré la présentation sur les Server Components. Super ambiance !" },
          { user: "host",    content: "Merci à tous d'être venus ! Prochain meetup en février 🚀" },
          { user: "player3", content: "La comparaison Bun vs Node était très claire. Bravo au speaker !" },
        ],
      },
      {
        slug: "test-workshop-react-19",
        title: "Workshop React 19 — Les nouvelles features",
        description:
          "Deep dive dans React 19 : Server Actions, hook use(), form actions et les nouveaux patterns " +
          "de data fetching. Session pratique avec exercices en live coding. " +
          "Pensez à apporter votre ordinateur.",
        startsAt: new Date("2026-02-05T18:30:00"),
        endsAt: new Date("2026-02-05T21:00:00"),
        locationType: "IN_PERSON" as const,
        locationName: "NUMA Paris",
        locationAddress: "39 Rue du Caire, 75002 Paris",
        capacity: 25,
        status: "PAST" as const,
        registrations: ["host", "player1", "player3"],
        comments: [
          { user: "player1", content: "Le hook use() change vraiment la façon d'écrire les composants. Merci !" },
          { user: "player3", content: "Excellent workshop, très pédagogique. On en redemande." },
        ],
      },
      {
        slug: "test-meetup-ia-creativite",
        title: "Meetup IA générative & Créativité",
        description:
          "Comment les outils d'IA transforment-ils les métiers créatifs ? " +
          "Retours d'expérience de designers, développeurs et artistes. " +
          "Table ronde + démonstrations live. Entrée libre.",
        startsAt: new Date("2026-03-20T19:00:00"),
        endsAt: new Date("2026-03-20T21:30:00"),
        locationType: "IN_PERSON" as const,
        locationName: "Station F",
        locationAddress: "5 Parvis Alan Turing, 75013 Paris",
        capacity: 60,
        status: "PUBLISHED" as const,
        registrations: ["host", "player1", "player2", "player4"],
        comments: [],
      },
      {
        slug: "test-webinaire-annule",
        title: "Webinaire TypeScript Avancé — ANNULÉ",
        description:
          "Webinaire sur les types avancés TypeScript : generics, mapped types, conditional types. " +
          "Malheureusement annulé suite à un imprévu de l'intervenant.",
        startsAt: new Date("2026-03-10T18:00:00"),
        endsAt: new Date("2026-03-10T19:30:00"),
        locationType: "ONLINE" as const,
        locationName: "Zoom",
        locationAddress: null,
        capacity: 100,
        status: "CANCELLED" as const,
        registrations: [],
        comments: [],
      },
      {
        slug: "test-atelier-complet",
        title: "Atelier Design System — Complet",
        description:
          "Atelier pratique sur la création d'un Design System avec Figma et Tailwind. " +
          "Places très limitées pour garantir un suivi personnalisé.",
        startsAt: new Date("2026-04-15T14:00:00"),
        endsAt: new Date("2026-04-15T17:00:00"),
        locationType: "IN_PERSON" as const,
        locationName: "NUMA Paris",
        locationAddress: "39 Rue du Caire, 75002 Paris",
        capacity: 3,
        status: "PUBLISHED" as const,
        registrations: ["host", "player1", "player2"],
        waitlisted: ["player3"],
        comments: [],
      },
      {
        slug: "test-hackathon-printemps-2026",
        title: "Hackathon Printemps 2026",
        description:
          "48h pour construire un projet autour du thème « Tech for Good ». " +
          "Équipes de 3 à 5 personnes. Prix : mentorat, visibilité et bien sûr la gloire ! " +
          "Repas et boissons inclus. Places limitées.",
        startsAt: new Date("2026-04-04T09:00:00"),
        endsAt: new Date("2026-04-05T18:00:00"),
        locationType: "IN_PERSON" as const,
        locationName: "Hôtel de Ville de Paris",
        locationAddress: "Place de l'Hôtel de Ville, 75004 Paris",
        capacity: 80,
        status: "PUBLISHED" as const,
        registrations: ["host", "player1"],
        comments: [],
      },
    ],
  },
  {
    // ── Circle 2 : bien-être ─────────────────────────────────────────────────
    slug: "yoga-montmartre",
    name: "Yoga Montmartre",
    description:
      "Pratique du yoga en plein air et en studio dans le quartier Montmartre. " +
      "Tous niveaux bienvenus. Ambiance bienveillante et inclusive. " +
      "Rejoignez notre communauté pour prendre soin de vous.",
    visibility: "PUBLIC" as const,
    moments: [
      {
        slug: "test-yoga-dominical-janvier",
        title: "Session Yoga du Dimanche",
        description:
          "Séance de yoga Flow pour bien commencer la semaine. " +
          "Apportez votre tapis et une bouteille d'eau. " +
          "Venez vous ressourcer dans l'air frais du parc, tous niveaux acceptés.",
        startsAt: new Date("2026-01-19T10:00:00"),
        endsAt: new Date("2026-01-19T11:30:00"),
        locationType: "IN_PERSON" as const,
        locationName: "Parc de la Butte Montmartre",
        locationAddress: "Butte Montmartre, 75018 Paris",
        capacity: 20,
        status: "PAST" as const,
        registrations: ["host", "player2", "player4"],
        comments: [
          { user: "player2", content: "Séance parfaite ! L'air frais du parc, c'est incomparable. À bientôt 🧘" },
          { user: "player4", content: "Première fois que je fais du yoga en extérieur, j'adore !" },
        ],
      },
      {
        slug: "test-atelier-meditation-mars",
        title: "Atelier Méditation & Respiration",
        description:
          "Techniques de respiration (pranayama) et méditation guidée. " +
          "Idéal pour gérer le stress et retrouver de l'énergie au quotidien. " +
          "Débutants et confirmés bienvenus. Prévoir une tenue confortable.",
        startsAt: new Date("2026-03-09T09:00:00"),
        endsAt: new Date("2026-03-09T11:00:00"),
        locationType: "IN_PERSON" as const,
        locationName: "Studio Montmartre Yoga",
        locationAddress: "12 Rue Lepic, 75018 Paris",
        capacity: 15,
        status: "PUBLISHED" as const,
        registrations: ["host", "player2", "player4"],
        comments: [],
      },
      {
        slug: "test-retraite-yoga-printemps-2026",
        title: "Retraite Yoga — Weekend Printemps",
        description:
          "Weekend immersif en Normandie : yoga matin et soir, ateliers bien-être, cuisine végétarienne. " +
          "Hébergement en gîte à la campagne. Tarif tout compris. " +
          "Un vrai bol d'air pour recharger les batteries avant l'été.",
        startsAt: new Date("2026-04-19T14:00:00"),
        endsAt: new Date("2026-04-20T17:00:00"),
        locationType: "IN_PERSON" as const,
        locationName: "Gîte La Ferme du Soleil",
        locationAddress: "Route des Champs, 27200 Vernon, Normandie",
        capacity: 12,
        status: "PUBLISHED" as const,
        registrations: ["host", "player2"],
        comments: [],
      },
    ],
  },
];

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🌱 Seed données test — The Playground");
  console.log("══════════════════════════════════════════\n");

  // 1. Utilisateurs
  console.log("👤 Utilisateurs...");
  const userMap: Record<string, string> = {};

  for (const { key, email, firstName, lastName, dashboardMode } of USERS) {
    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name: `${firstName} ${lastName}`,
        firstName,
        lastName,
        onboardingCompleted: true,
        emailVerified: new Date(),
        dashboardMode,
      },
      update: {
        name: `${firstName} ${lastName}`,
        firstName,
        lastName,
        onboardingCompleted: true,
        emailVerified: new Date(),
        dashboardMode,
      },
    });
    userMap[key] = user.id;
    console.log(`  ✓ ${user.email}  →  ${user.name}`);
  }

  // 2. Circles, Moments, Registrations, Comments
  for (const circleData of SEED_DATA) {
    console.log(`\n⭕ Circle: ${circleData.name}`);

    const circle = await prisma.circle.upsert({
      where: { slug: circleData.slug },
      create: {
        slug: circleData.slug,
        name: circleData.name,
        description: circleData.description,
        visibility: circleData.visibility,
      },
      update: {
        name: circleData.name,
        description: circleData.description,
        visibility: circleData.visibility,
      },
    });

    // Host membership
    await prisma.circleMembership.upsert({
      where: { userId_circleId: { userId: userMap["host"], circleId: circle.id } },
      create: { userId: userMap["host"], circleId: circle.id, role: "HOST" },
      update: { role: "HOST" },
    });

    const playersInCircle = new Set<string>();

    for (const momentData of circleData.moments) {
      const moment = await prisma.moment.upsert({
        where: { slug: momentData.slug },
        create: {
          slug: momentData.slug,
          circleId: circle.id,
          createdById: userMap["host"],
          title: momentData.title,
          description: momentData.description,
          startsAt: momentData.startsAt,
          endsAt: momentData.endsAt ?? null,
          locationType: momentData.locationType,
          locationName: momentData.locationName,
          locationAddress: momentData.locationAddress ?? null,
          capacity: momentData.capacity,
          price: 0,
          currency: "EUR",
          status: momentData.status,
        },
        update: {
          title: momentData.title,
          description: momentData.description,
          startsAt: momentData.startsAt,
          endsAt: momentData.endsAt ?? null,
          status: momentData.status,
          capacity: momentData.capacity,
        },
      });
      console.log(`  📅 ${momentData.status === "PAST" ? "↩" : "→"} ${momentData.title}`);

      // Registrations
      for (const userKey of momentData.registrations) {
        const userId = userMap[userKey];
        if (!userId) continue;
        await prisma.registration.upsert({
          where: { momentId_userId: { momentId: moment.id, userId } },
          create: { momentId: moment.id, userId, status: "REGISTERED", paymentStatus: "NONE" },
          update: { status: "REGISTERED" },
        });
        if (userKey !== "host") playersInCircle.add(userId);
      }

      // Waitlisted registrations
      const waitlisted = (momentData as { waitlisted?: string[] }).waitlisted ?? [];
      for (const userKey of waitlisted) {
        const userId = userMap[userKey];
        if (!userId) continue;
        await prisma.registration.upsert({
          where: { momentId_userId: { momentId: moment.id, userId } },
          create: { momentId: moment.id, userId, status: "WAITLISTED", paymentStatus: "NONE" },
          update: { status: "WAITLISTED" },
        });
        playersInCircle.add(userId);
      }

      // Comments (idempotent : crée seulement si le user n'a pas encore commenté ce Moment)
      for (const { user: userKey, content } of momentData.comments) {
        const userId = userMap[userKey];
        if (!userId) continue;
        const existing = await prisma.comment.findFirst({
          where: { momentId: moment.id, userId },
        });
        if (!existing) {
          await prisma.comment.create({
            data: { momentId: moment.id, userId, content },
          });
        }
      }
    }

    // Player memberships dans le Circle
    for (const playerId of playersInCircle) {
      await prisma.circleMembership.upsert({
        where: { userId_circleId: { userId: playerId, circleId: circle.id } },
        create: { userId: playerId, circleId: circle.id, role: "PLAYER" },
        update: {},
      });
    }
  }

  // Récapitulatif
  console.log("\n✅ Données test injectées avec succès.\n");
  console.log("Impersonation (dev uniquement) :");
  for (const { email } of USERS) {
    console.log(`  http://localhost:3000/api/dev/impersonate?email=${encodeURIComponent(email)}`);
  }
  console.log();
}

main()
  .catch((e) => {
    console.error("\n❌ Erreur :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
