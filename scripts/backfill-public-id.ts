/**
 * Backfill du publicId pour les utilisateurs existants.
 *
 * Génère un publicId unique (prénom-nom-xxxx) pour chaque utilisateur
 * qui n'en a pas encore.
 *
 * Idempotent : ne touche pas les utilisateurs qui ont déjà un publicId.
 *
 * Usage dev  : pnpm db:backfill-public-id
 * Usage prod : pnpm db:backfill-public-id:prod
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

function slugify(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function generatePublicId(firstName: string | null, lastName: string | null): string {
  const random = Math.floor(1000 + Math.random() * 9000);
  const base = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (!base) return `user-${Math.floor(10000 + Math.random() * 90000)}`;
  return `${slugify(base)}-${random}`;
}

async function main() {
  const totalNull = await prisma.user.count({ where: { publicId: null } });

  if (totalNull === 0) {
    console.log("✅ Tous les utilisateurs ont déjà un publicId. Rien à faire.");
    return;
  }

  console.log(`\n🔍 ${totalNull} utilisateur(s) sans publicId — backfill en cours...\n`);

  const users = await prisma.user.findMany({
    where: { publicId: null },
    select: { id: true, firstName: true, lastName: true },
  });

  let updated = 0;
  let failed = 0;

  for (const user of users) {
    let success = false;

    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = generatePublicId(user.firstName, user.lastName);
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { publicId: candidate },
        });
        success = true;
        updated++;
        break;
      } catch {
        // Collision unique constraint → réessayer avec un nouveau nombre aléatoire
      }
    }

    if (!success) {
      console.warn(`  ⚠️  Impossible de générer un publicId pour l'utilisateur ${user.id}`);
      failed++;
    }
  }

  console.log(`\n✅ Backfill terminé — ${updated} utilisateur(s) mis à jour.`);
  if (failed > 0) {
    console.warn(`⚠️  ${failed} utilisateur(s) n'ont pas pu être mis à jour.`);
  }
  console.log();
}

main()
  .catch((e) => {
    console.error("❌ Erreur :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
