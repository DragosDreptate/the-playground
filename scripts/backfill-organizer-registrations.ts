/**
 * Backfill des inscriptions des organisateurs aux événements à venir.
 *
 * Pour chaque événement à venir (startsAt > now, status DRAFT ou PUBLISHED),
 * inscrit en REGISTERED tous les organisateurs actifs (HOST + CO_HOST, status
 * ACTIVE) du Circle qui n'ont pas déjà une inscription active sur cet événement.
 *
 * Répare les événements créés avant la généralisation de l'auto-inscription des
 * organisateurs — voir spec/features/co-host-event-participation.md.
 *
 * Insertion DIRECTE en base (pas via les usecases / server actions) → AUCUNE
 * notification n'est envoyée aux hosts. Idempotent.
 *
 * Dry-run par défaut. Ajouter --execute pour appliquer.
 *
 * Usage dev  : pnpm db:backfill-organizer-registrations [--execute]
 * Usage prod : pnpm db:backfill-organizer-registrations:prod
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL non défini.");
  process.exit(1);
}

const EXECUTE = process.argv.includes("--execute");

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
});

// Statuts d'inscription considérés comme "actifs" (l'organisateur participe déjà).
const ACTIVE_STATUSES = [
  "REGISTERED",
  "WAITLISTED",
  "PENDING_APPROVAL",
  "CHECKED_IN",
] as const;

async function main() {
  const now = new Date();

  const upcomingMoments = await prisma.moment.findMany({
    where: {
      startsAt: { gt: now },
      status: { in: ["DRAFT", "PUBLISHED"] },
    },
    select: { id: true, circleId: true, title: true, slug: true },
  });

  if (upcomingMoments.length === 0) {
    console.log("✅ Aucun événement à venir. Rien à faire.");
    return;
  }

  console.log(
    `\n🔍 ${upcomingMoments.length} événement(s) à venir analysé(s)${EXECUTE ? "" : " (DRY-RUN)"}...\n`
  );

  let created = 0;
  let reactivated = 0;
  let skipped = 0;

  for (const moment of upcomingMoments) {
    const [organizers, registrations] = await Promise.all([
      prisma.circleMembership.findMany({
        where: {
          circleId: moment.circleId,
          role: { in: ["HOST", "CO_HOST"] },
          status: "ACTIVE",
        },
        select: { userId: true },
      }),
      prisma.registration.findMany({
        where: { momentId: moment.id },
        select: { id: true, userId: true, status: true },
      }),
    ]);

    const byUser = new Map(registrations.map((r) => [r.userId, r]));

    for (const organizer of organizers) {
      const existing = byUser.get(organizer.userId);

      if (existing && (ACTIVE_STATUSES as readonly string[]).includes(existing.status)) {
        skipped++;
        continue;
      }

      if (!existing) {
        console.log(`  + ${moment.slug} → inscription de ${organizer.userId}`);
        if (EXECUTE) {
          await prisma.registration.create({
            data: {
              momentId: moment.id,
              userId: organizer.userId,
              status: "REGISTERED",
            },
          });
        }
        created++;
      } else {
        // Inscription CANCELLED ou REJECTED → réactivée en REGISTERED.
        console.log(`  ↻ ${moment.slug} → réactivation de ${organizer.userId}`);
        if (EXECUTE) {
          await prisma.registration.update({
            where: { id: existing.id },
            data: { status: "REGISTERED", cancelledAt: null },
          });
        }
        reactivated++;
      }
    }
  }

  console.log(
    `\n${EXECUTE ? "✅ Backfill terminé" : "🔎 DRY-RUN (aucune écriture)"} — ` +
      `${created} créée(s), ${reactivated} réactivée(s), ${skipped} déjà inscrite(s).`
  );
  if (!EXECUTE && created + reactivated > 0) {
    console.log("   Relancer avec --execute pour appliquer.");
  }
  console.log();
}

main()
  .catch((e) => {
    console.error("❌ Erreur :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
