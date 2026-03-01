/**
 * Global setup Playwright — seed DB + génération des storage states d'auth
 *
 * Exécuté une seule fois avant tous les tests E2E.
 *
 * Séquence :
 *   1. Seed les données de test (idempotent)
 *   2. Crée / reset le user onboarding-test (onboardingCompleted=false)
 *   3. Génère les storage states d'auth pour host, player1, player3, onboarding-test
 *
 * Dépendance : le serveur Next.js doit être démarré (géré par webServer dans playwright.config.ts)
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { execSync } from "child_process";
import { chromium } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import path from "path";
import fs from "fs";

import { AUTH, TEST_USERS } from "./fixtures";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

async function main() {
  console.log("\n🎭 Global setup E2E — The Playground");
  console.log("══════════════════════════════════════════\n");

  // 1. Seed les données de test
  console.log("🌱 Seed données test...");
  execSync("pnpm db:seed-test-data", { stdio: "inherit" });

  // 2. Crée / reset le user onboarding-test (non onboardé)
  console.log("\n👤 Reset user onboarding-test...");
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  await prisma.user.upsert({
    where: { email: TEST_USERS.ONBOARDING },
    create: {
      email: TEST_USERS.ONBOARDING,
      name: "Test Onboarding",
      onboardingCompleted: false,
    },
    update: {
      onboardingCompleted: false,
    },
  });
  console.log(`  ✓ ${TEST_USERS.ONBOARDING} — onboardingCompleted = false`);

  await prisma.$disconnect();

  // 3. Génère les storage states via l'endpoint de dev impersonation
  console.log("\n🔑 Génération des storage states d'auth...");

  const authDir = path.dirname(AUTH.HOST);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const sessions: Array<{ label: string; email: string; outputPath: string }> = [
    { label: "Host",           email: TEST_USERS.HOST,       outputPath: AUTH.HOST },
    { label: "Player1",        email: TEST_USERS.PLAYER,     outputPath: AUTH.PLAYER },
    { label: "Player3",        email: TEST_USERS.PLAYER3,    outputPath: AUTH.PLAYER3 },
    { label: "Onboarding",     email: TEST_USERS.ONBOARDING, outputPath: AUTH.ONBOARDING },
  ];

  const browser = await chromium.launch();

  for (const { label, email, outputPath } of sessions) {
    const context = await browser.newContext();
    const page = await context.newPage();

    const e2eSecret = process.env.E2E_SECRET;
    const secretParam = e2eSecret ? `&secret=${encodeURIComponent(e2eSecret)}` : "";
    const url = `${BASE_URL}/api/dev/impersonate?email=${encodeURIComponent(email)}${secretParam}`;
    const response = await page.goto(url);

    if (!response?.ok()) {
      console.error(`  ✗ Impersonation failed pour ${email}: ${response?.status()} ${response?.statusText()}`);
      console.error("  Vérifier que /api/dev/impersonate est disponible (NODE_ENV=development)");
      await browser.close();
      process.exit(1);
    }

    await context.storageState({ path: outputPath });
    console.log(`  ✓ ${label} (${email}) → ${outputPath}`);

    await context.close();
  }

  await browser.close();

  console.log("\n✅ Global setup terminé — tous les storage states générés.\n");
}

export default main;
