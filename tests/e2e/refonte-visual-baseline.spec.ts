import { test, expect, type Page } from "@playwright/test";
import { SLUGS, AUTH } from "./fixtures";

/**
 * Visual regression baseline — Refonte UI Circle + Moment (2026-04-19)
 *
 * Capture la baseline visuelle des 4 surfaces × 3 états d'auth × 2 viewports
 * concernés par la refonte. Ré-exécuté après chaque extraction de composant
 * en Phase 0 pour garantir zéro changement visuel pendant les refactors.
 *
 * Matrice d'états :
 *   Circle public    : guest, player, host
 *   Circle dashboard : player, host
 *   Moment public    : guest, player, host
 *   Moment dashboard : player, host
 *
 * = 10 états × 2 viewports = 20 snapshots
 *
 * Générer / mettre à jour la baseline :
 *   pnpm test:e2e refonte-visual-baseline --update-snapshots
 *
 * Vérifier (après refactor) :
 *   pnpm test:e2e refonte-visual-baseline
 *
 * Les snapshots sont stockés dans refonte-visual-baseline.spec.ts-snapshots/.
 *
 * Limites connues :
 *   - Les textes de dates relatives ("il y a 2 mois") drift sur plusieurs jours.
 *     Si la baseline est ancienne, regénérer les snapshots.
 *   - Le seed est déterministe (slugs, users), mais createdAt peut varier.
 */

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 375, height: 812 };

type AuthState = {
  label: "guest" | "player" | "host";
  storage: string | undefined;
};

type Surface = {
  name: string;
  url: string;
  authStates: AuthState[];
};

const SURFACES: Surface[] = [
  {
    name: "circle-public",
    url: `/fr/circles/${SLUGS.CIRCLE}`,
    authStates: [
      { label: "guest", storage: undefined },
      { label: "player", storage: AUTH.PLAYER },
      { label: "host", storage: AUTH.HOST },
    ],
  },
  {
    name: "circle-dashboard",
    url: `/fr/dashboard/circles/${SLUGS.CIRCLE}`,
    authStates: [
      { label: "player", storage: AUTH.PLAYER },
      { label: "host", storage: AUTH.HOST },
    ],
  },
  {
    name: "moment-public",
    url: `/fr/m/${SLUGS.PUBLISHED_MOMENT}`,
    authStates: [
      { label: "guest", storage: undefined },
      { label: "player", storage: AUTH.PLAYER },
      { label: "host", storage: AUTH.HOST },
    ],
  },
  {
    name: "moment-dashboard",
    url: `/fr/dashboard/circles/${SLUGS.CIRCLE}/moments/${SLUGS.PUBLISHED_MOMENT}`,
    authStates: [
      { label: "player", storage: AUTH.PLAYER },
      { label: "host", storage: AUTH.HOST },
    ],
  },
];

async function waitForStableRender(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
}

for (const surface of SURFACES) {
  for (const authState of surface.authStates) {
    test.describe(`Visual baseline — ${surface.name} (${authState.label})`, () => {
      test.skip(
        !!process.env.CI,
        "Visual regression runs locally only (rendering differs macOS vs Linux). Outil temporaire de la Phase 0.",
      );

      test("desktop", async ({ browser }) => {
        const context = await browser.newContext({
          storageState: authState.storage,
          viewport: DESKTOP,
        });
        const page = await context.newPage();
        await page.goto(surface.url);
        await waitForStableRender(page);
        await expect(page).toHaveScreenshot(
          `${surface.name}-${authState.label}-desktop.png`,
          {
            fullPage: true,
            animations: "disabled",
            maxDiffPixelRatio: 0.01,
          },
        );
        await context.close();
      });

      test("mobile", async ({ browser }) => {
        const context = await browser.newContext({
          storageState: authState.storage,
          viewport: MOBILE,
        });
        const page = await context.newPage();
        await page.goto(surface.url);
        await waitForStableRender(page);
        await expect(page).toHaveScreenshot(
          `${surface.name}-${authState.label}-mobile.png`,
          {
            fullPage: true,
            animations: "disabled",
            maxDiffPixelRatio: 0.01,
          },
        );
        await context.close();
      });
    });
  }
}
