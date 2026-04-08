/**
 * Global teardown Playwright — nettoyage des données @test.playground après les tests E2E
 *
 * Exécuté une seule fois après tous les tests E2E.
 *
 * Supprime dans l'ordre (contraintes FK) :
 *   1. Moments créés par les utilisateurs test (Moment.createdById sans cascade)
 *      → Cascade automatique : Registrations + Comments
 *   2. Circles hébergés par les utilisateurs test
 *      → Cascade automatique : Moments résiduels + Memberships
 *   3. Utilisateurs test (@test.playground)
 *      → Cascade automatique : Account, Session, et données résiduelles
 *
 * Le prochain run relance global-setup.ts qui re-seed les données (idempotent).
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const TEST_DOMAIN = "@test.playground";

async function main() {
  console.log("\n🧹 Global teardown E2E — nettoyage données test");
  console.log("══════════════════════════════════════════\n");

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL non défini — teardown ignoré.");
    return;
  }

  const prisma = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    const testUsers = await prisma.user.findMany({
      where: { email: { endsWith: TEST_DOMAIN } },
      select: { id: true },
    });

    if (testUsers.length === 0) {
      console.log("✅ Aucun utilisateur test trouvé — base déjà propre.\n");
      return;
    }

    const testUserIds = testUsers.map((u) => u.id);

    // Étape 0 — CircleNetworks de test (slug commençant par "test-")
    const deletedNetworks = await prisma.circleNetwork.deleteMany({
      where: { slug: { startsWith: "test-" } },
    });
    if (deletedNetworks.count > 0) {
      console.log(`  ✓ ${deletedNetworks.count} CircleNetwork(s) supprimé(s)`);
    }

    // Étape 1 — Moments créés par les utilisateurs test (FK sans cascade)
    const deletedMoments = await prisma.moment.deleteMany({
      where: { createdById: { in: testUserIds } },
    });
    console.log(`  ✓ ${deletedMoments.count} Moment(s) supprimé(s)`);

    // Étape 2 — Circles hébergés par les utilisateurs test
    const testCircles = await prisma.circle.findMany({
      where: {
        memberships: { some: { userId: { in: testUserIds }, role: "HOST" } },
      },
      select: { id: true },
    });

    if (testCircles.length > 0) {
      const deletedCircles = await prisma.circle.deleteMany({
        where: { id: { in: testCircles.map((c) => c.id) } },
      });
      console.log(`  ✓ ${deletedCircles.count} Circle(s) supprimé(s)`);
    }

    // Étape 3 — Utilisateurs test (cascade : Account, Session, memberships résiduelles)
    const deletedUsers = await prisma.user.deleteMany({
      where: { email: { endsWith: TEST_DOMAIN } },
    });
    console.log(`  ✓ ${deletedUsers.count} utilisateur(s) test supprimé(s)`);

    console.log("\n✅ Teardown terminé — base de données propre.\n");
  } finally {
    await prisma.$disconnect();
  }
}

export default main;
