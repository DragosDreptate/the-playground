/**
 * Setup Auth pour les tests mobile authentifiés.
 *
 * Ce script ouvre une fenêtre de navigateur pour que tu te connectes manuellement,
 * puis sauvegarde la session dans tests/mobile/.auth/session.json.
 *
 * Lancer une seule fois (ou après expiration de session) :
 *   pnpm test:mobile:setup
 */

import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const AUTH_FILE = path.join(__dirname, ".auth/session.json");

async function main() {
  // Créer le dossier .auth si nécessaire
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  // Utiliser le vrai Chrome installé (pas Chromium) pour permettre OAuth Google
  const browser = await chromium.launch({ headless: false, channel: "chrome" });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("\n📱 Setup Auth — Tests Mobile");
  console.log("════════════════════════════════");
  console.log(`Ouverture de ${BASE_URL}/auth/sign-in`);
  console.log("Connecte-toi avec ton compte (Google, GitHub ou magic link),");
  console.log("puis appuie sur Entrée dans ce terminal.\n");

  await page.goto(`${BASE_URL}/auth/sign-in`);

  // Attendre que l'utilisateur se connecte manuellement
  await new Promise<void>((resolve) => {
    process.stdin.once("data", () => resolve());
  });

  // Sauvegarder la session
  await context.storageState({ path: AUTH_FILE });
  console.log(`\n✅ Session sauvegardée dans ${AUTH_FILE}`);
  console.log("Tu peux maintenant lancer : pnpm test:mobile\n");

  await browser.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("Erreur :", err);
  process.exit(1);
});
