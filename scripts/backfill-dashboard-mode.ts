/**
 * Backfill du dashboardMode pour les utilisateurs existants.
 *
 * Assigne un mode par défaut aux utilisateurs qui n'ont pas encore choisi
 * (dashboardMode === null), sur la base de leur activité réelle :
 *
 *   - HOST d'au moins un Circle → ORGANIZER
 *   - Aucun Circle HOST          → PARTICIPANT
 *
 * Idempotent : ne touche pas les utilisateurs qui ont déjà un mode défini.
 *
 * Usage dev  : pnpm db:backfill-dashboard-mode
 * Usage prod : pnpm db:backfill-dashboard-mode:prod
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
  const totalNull = await prisma.user.count({ where: { dashboardMode: null } });

  if (totalNull === 0) {
    console.log("✅ Tous les utilisateurs ont déjà un dashboardMode défini. Rien à faire.");
    return;
  }

  console.log(`\n🔍 ${totalNull} utilisateur(s) sans dashboardMode — backfill en cours...\n`);

  // Passe 1 : HOST d'au moins un Circle → ORGANIZER
  const organizerResult = await prisma.user.updateMany({
    where: {
      dashboardMode: null,
      memberships: { some: { role: "HOST" } },
    },
    data: { dashboardMode: "ORGANIZER" },
  });

  console.log(`  ✓ ${organizerResult.count} Organisateur(s) → ORGANIZER`);

  // Passe 2 : tous les null restants (aucun Circle HOST) → PARTICIPANT
  const participantResult = await prisma.user.updateMany({
    where: { dashboardMode: null },
    data: { dashboardMode: "PARTICIPANT" },
  });

  console.log(`  ✓ ${participantResult.count} Participant(s) → PARTICIPANT`);

  const total = organizerResult.count + participantResult.count;
  console.log(`\n✅ Backfill terminé — ${total} utilisateur(s) mis à jour.\n`);
}

main()
  .catch((e) => {
    console.error("❌ Erreur :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
