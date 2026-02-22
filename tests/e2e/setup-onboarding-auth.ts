/**
 * Script de setup pour les tests E2E d'onboarding.
 *
 * Crée (ou reset) un utilisateur de test avec onboardingCompleted = false,
 * puis capture la session via l'endpoint de dev impersonation.
 *
 * Résultat : un fichier JSON de storageState Playwright pour
 * E2E_ONBOARDING_STORAGE_STATE.
 *
 * Usage :
 *   tsx tests/e2e/setup-onboarding-auth.ts
 *   E2E_ONBOARDING_STORAGE_STATE=tests/e2e/.auth/onboarding.json pnpm test:e2e
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { chromium } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import path from "path";
import fs from "fs";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUTPUT_FILE = process.argv[2] ?? "tests/e2e/.auth/onboarding.json";
const TEST_EMAIL = "onboarding-test@test.playground";

async function main() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  // Crée ou reset l'utilisateur non-onboardé
  const user = await prisma.user.upsert({
    where: { email: TEST_EMAIL },
    create: {
      email: TEST_EMAIL,
      name: "Test Onboarding",
      onboardingCompleted: false,
    },
    update: {
      onboardingCompleted: false,
    },
  });

  console.log(`✓ User ${user.email} — onboardingCompleted = ${user.onboardingCompleted}`);

  // Assure que le dossier de sortie existe
  const dir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Capture la session via l'endpoint de dev impersonation
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const response = await page.goto(
    `${BASE_URL}/api/dev/impersonate?email=${encodeURIComponent(TEST_EMAIL)}`
  );

  if (!response?.ok()) {
    console.error(`✗ Impersonation failed: ${response?.status()} ${response?.statusText()}`);
    console.error("Vérifier que /api/dev/impersonate est disponible et que NODE_ENV=development");
    process.exit(1);
  }

  await context.storageState({ path: OUTPUT_FILE });
  console.log(`✓ Storage state sauvegardé dans ${OUTPUT_FILE}`);

  await browser.close();
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
