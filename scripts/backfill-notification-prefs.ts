/**
 * Backfill des préférences de notifications email.
 *
 * Met à true toutes les colonnes de notification pour les utilisateurs existants
 * dont au moins une préférence est à false (cas des users créés avant la migration).
 *
 * Idempotent : safe à relancer, ne touche pas les users qui ont déjà tout à true.
 *
 * Usage dev  : pnpm db:backfill-notification-prefs
 * Usage prod : pnpm db:backfill-notification-prefs:prod
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
  console.log("🔍 Recherche des utilisateurs avec des préférences à false...");

  const usersToFix = await prisma.user.findMany({
    where: {
      OR: [
        { notifyNewRegistration: false },
        { notifyNewComment: false },
        { notifyNewFollower: false },
        { notifyNewMomentInCircle: false },
      ],
    },
    select: { id: true, email: true },
  });

  if (usersToFix.length === 0) {
    console.log("✅ Tous les utilisateurs ont déjà leurs préférences à true. Rien à faire.");
    return;
  }

  console.log(`⚠️  ${usersToFix.length} utilisateur(s) à corriger :`);
  for (const u of usersToFix) {
    console.log(`   - ${u.email}`);
  }

  const result = await prisma.user.updateMany({
    where: {
      OR: [
        { notifyNewRegistration: false },
        { notifyNewComment: false },
        { notifyNewFollower: false },
        { notifyNewMomentInCircle: false },
      ],
    },
    data: {
      notifyNewRegistration: true,
      notifyNewComment: true,
      notifyNewFollower: true,
      notifyNewMomentInCircle: true,
    },
  });

  console.log(`✅ ${result.count} utilisateur(s) mis à jour — toutes les notifications sont maintenant à true.`);
}

main()
  .catch((e) => {
    console.error("❌ Erreur :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
