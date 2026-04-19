import { test, expect, type Page } from "@playwright/test";
import { SLUGS, AUTH } from "./fixtures";

/**
 * Visual regression baseline — Refonte UI Circle + Moment (2026-04-19)
 *
 * Capture la baseline visuelle des 4 surfaces concernées par la refonte.
 * Ré-exécuté après chaque extraction de composant en Phase 0 pour garantir
 * zéro changement visuel pendant les refactors.
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
 *     Si la baseline est ancienne, regénérer les snapshots au début d'une
 *     nouvelle session de travail.
 *   - Le seed des données de test est déterministe (même slugs, mêmes users),
 *     mais les dates createdAt peuvent varier selon le moment du seed.
 */

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 375, height: 812 };

const SURFACES = [
  {
    name: "circle-public",
    url: `/fr/circles/${SLUGS.CIRCLE}`,
    auth: AUTH.HOST,
  },
  {
    name: "circle-dashboard",
    url: `/fr/dashboard/circles/${SLUGS.CIRCLE}`,
    auth: AUTH.HOST,
  },
  {
    name: "moment-public",
    url: `/fr/m/${SLUGS.PUBLISHED_MOMENT}`,
    auth: AUTH.HOST,
  },
  {
    name: "moment-dashboard",
    url: `/fr/dashboard/circles/${SLUGS.CIRCLE}/moments/${SLUGS.PUBLISHED_MOMENT}`,
    auth: AUTH.HOST,
  },
] as const;

async function waitForStableRender(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
}

for (const surface of SURFACES) {
  test.describe(`Visual baseline — ${surface.name}`, () => {
    test.skip(
      !!process.env.CI,
      "Visual regression runs locally only (rendering differs macOS vs Linux). Outil temporaire de la Phase 0.",
    );

    test("desktop", async ({ browser }) => {
      const context = await browser.newContext({
        storageState: surface.auth,
        viewport: DESKTOP,
      });
      const page = await context.newPage();
      await page.goto(surface.url);
      await waitForStableRender(page);
      await expect(page).toHaveScreenshot(`${surface.name}-desktop.png`, {
        fullPage: true,
        animations: "disabled",
        maxDiffPixelRatio: 0.01,
      });
      await context.close();
    });

    test("mobile", async ({ browser }) => {
      const context = await browser.newContext({
        storageState: surface.auth,
        viewport: MOBILE,
      });
      const page = await context.newPage();
      await page.goto(surface.url);
      await waitForStableRender(page);
      await expect(page).toHaveScreenshot(`${surface.name}-mobile.png`, {
        fullPage: true,
        animations: "disabled",
        maxDiffPixelRatio: 0.01,
      });
      await context.close();
    });
  });
}
