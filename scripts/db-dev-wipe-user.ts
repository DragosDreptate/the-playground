/**
 * Supprime un utilisateur et toutes ses données de la DB de dev.
 * Permet de re-tester le parcours sign-in / onboarding depuis zéro.
 *
 * Usage : pnpm db:dev:wipe-user <email>
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const email = process.argv[2];

if (!email) {
  console.error("Usage: pnpm db:dev:wipe-user <email>");
  process.exit(1);
}

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      _count: {
        select: {
          accounts: true,
          sessions: true,
          memberships: true,
          moments: true,
          registrations: true,
          comments: true,
        },
      },
    },
  });

  if (!user) {
    console.log(`Aucun utilisateur trouvé avec l'email : ${email}`);
    process.exit(0);
  }

  console.log(`Utilisateur trouvé : ${user.name ?? "(sans nom)"} <${user.email}>`);
  console.log(`  Comptes OAuth   : ${user._count.accounts}`);
  console.log(`  Sessions        : ${user._count.sessions}`);
  console.log(`  Memberships     : ${user._count.memberships}`);
  console.log(`  Moments créés   : ${user._count.moments}`);
  console.log(`  Inscriptions    : ${user._count.registrations}`);
  console.log(`  Commentaires    : ${user._count.comments}`);
  console.log();

  // Supprimer les Moments créés par le user (pas de onDelete: Cascade sur createdBy)
  const deletedMoments = await prisma.moment.deleteMany({
    where: { createdById: user.id },
  });

  // Supprimer le user (cascade : accounts, sessions, memberships, registrations, comments)
  await prisma.user.delete({ where: { id: user.id } });

  console.log(`Supprimé :`);
  console.log(`  - User ${email}`);
  console.log(`  - ${deletedMoments.count} Moment(s) (+ leurs inscriptions/commentaires en cascade)`);
  console.log(`  - Comptes OAuth, sessions, memberships, inscriptions, commentaires (cascade)`);
}

main()
  .catch((e) => {
    console.error("Erreur :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
