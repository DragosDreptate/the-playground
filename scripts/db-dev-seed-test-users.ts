/**
 * Crée 3 utilisateurs de test en DB dev pour tester les rôles Host/Player.
 * Idempotent : utilise upsert, safe à relancer.
 *
 * Usage : pnpm db:dev:seed-test-users
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const TEST_USERS = [
  { email: "host@test.playground", firstName: "Alice", lastName: "Martin" },
  { email: "player1@test.playground", firstName: "Bob", lastName: "Dupont" },
  { email: "player2@test.playground", firstName: "Claire", lastName: "Leroy" },
];

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  for (const { email, firstName, lastName } of TEST_USERS) {
    const name = `${firstName} ${lastName}`;
    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name,
        firstName,
        lastName,
        onboardingCompleted: true,
        emailVerified: new Date(),
      },
      update: {
        name,
        firstName,
        lastName,
        onboardingCompleted: true,
        emailVerified: new Date(),
      },
    });
    console.log(`✓ ${user.email} (${user.name}) — id: ${user.id}`);
  }

  console.log("\n3 utilisateurs de test prêts.");
  console.log("Impersonation :");
  for (const { email } of TEST_USERS) {
    console.log(`  http://localhost:3000/api/dev/impersonate?email=${email}`);
  }
}

main()
  .catch((e) => {
    console.error("Erreur :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
