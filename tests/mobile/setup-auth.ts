/**
 * Setup Auth pour les tests mobile authentifiés.
 *
 * Ce script ouvre une fenêtre Chrome avec ton profil utilisateur existant
 * (où tu es déjà connecté à Google), te redirige vers la page de connexion,
 * puis sauvegarde la session Playwright dans tests/mobile/.auth/session.json.
 *
 * Lancer une seule fois (ou après expiration de session) :
 *   pnpm test:mobile:setup
 *
 * IMPORTANT : Ferme toutes les fenêtres Chrome avant de lancer ce script,
 * sinon Playwright ne pourra pas accéder au profil.
 */

import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";
import os from "os";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const AUTH_FILE = path.join(__dirname, ".auth/session.json");

function getChromeUserDataDir(): string {
  const platform = os.platform();
  if (platform === "darwin") {
    return path.join(os.homedir(), "Library/Application Support/Google/Chrome");
  }
  if (platform === "win32") {
    return path.join(os.homedir(), "AppData/Local/Google/Chrome/User Data");
  }
  // Linux
  return path.join(os.homedir(), ".config/google-chrome");
}

async function main() {
  // Créer le dossier .auth si nécessaire
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  console.log("\n📱 Setup Auth — Tests Mobile");
  console.log("════════════════════════════════");
  console.log("IMPORTANT : Ferme toutes les fenêtres Chrome avant de continuer.");
  console.log("Appuie sur Entrée quand Chrome est fermé...\n");

  await new Promise<void>((resolve) => {
    process.stdin.once("data", () => resolve());
  });

  // Lancer Chrome avec le profil utilisateur existant (session Google déjà active)
  const userDataDir = getChromeUserDataDir();
  console.log(`Profil Chrome : ${userDataDir}`);

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    channel: "chrome",
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const page = context.pages()[0] || await context.newPage();

  console.log(`\nOuverture de ${BASE_URL}/auth/sign-in`);
  console.log("Connecte-toi (Google, GitHub ou magic link),");
  console.log("attends d'être redirigé vers le dashboard,");
  console.log("puis appuie sur Entrée dans ce terminal.\n");

  await page.goto(`${BASE_URL}/auth/sign-in`);

  // Attendre que l'utilisateur se connecte
  await new Promise<void>((resolve) => {
    process.stdin.once("data", () => resolve());
  });

  // Sauvegarder la session (cookies + localStorage)
  await context.storageState({ path: AUTH_FILE });
  console.log(`\n✅ Session sauvegardée dans ${AUTH_FILE}`);
  console.log("Tu peux maintenant lancer : pnpm test:mobile\n");

  await context.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("Erreur :", err);
  process.exit(1);
});
