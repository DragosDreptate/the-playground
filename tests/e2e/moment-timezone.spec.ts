import { test, expect, chromium, webkit, type Browser, type Page } from "@playwright/test";
import { SLUGS } from "./fixtures";

/**
 * Tests E2E — Fuseaux horaires des événements (#475, ADR-0008)
 *
 * Règle testée : l'affichage web suit le fuseau du VISITEUR ; le repli servi avant
 * hydratation est le fuseau de l'ÉVÉNEMENT.
 *
 * Deux précautions rendent ces tests déterministes :
 *
 * 1. On attend `data-timezone` = fuseau du visiteur avant de lire l'heure. Sans cette
 *    attente, on lit parfois le repli serveur — WebKit hydrate assez lentement pour
 *    que la course soit perdue une fois sur deux.
 * 2. Les assertions portent sur l'ÉCART entre deux fuseaux, jamais sur une heure en
 *    dur : l'événement de seed est planté à J+7 en heure locale, donc son instant
 *    absolu bouge d'un run à l'autre. Dublin et Paris suivent tous deux l'heure d'été
 *    européenne, donc leur écart vaut 60 minutes en toute saison.
 *
 * Les deux moteurs sont lancés explicitement plutôt que déclarés en projets Playwright :
 * ça garde la validation WebKit dans ce seul fichier, sans doubler la durée de toute la
 * suite E2E en CI.
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const MOMENT_URL = `${BASE_URL}/m/${SLUGS.PUBLISHED_MOMENT}`;
const CIRCLE_URL = `${BASE_URL}/circles/${SLUGS.CIRCLE}`;

/** Fuseau de l'événement de seed (défaut plateforme, aucun fuseau explicite au seed). */
const EVENT_TIMEZONE = "Europe/Paris";

const ENGINES = [
  { name: "chromium", launcher: chromium },
  // Le parc utilisateur est massivement iPhone, où tous les navigateurs sont WebKit :
  // un comportement de rendu validé sur le seul Chromium ne prouve rien pour eux.
  { name: "webkit", launcher: webkit },
] as const;

/**
 * Minutes depuis minuit du "HH:MM" porté par un élément daté VISIBLE.
 *
 * Le filtre sur le texte écarte les `<time>` qui ne portent qu'une date, et `:visible`
 * écarte les branches mobile/desktop masquées en CSS (les deux sont dans le DOM).
 */
async function readTimeInMinutes(page: Page, timezone: string): Promise<number> {
  const dated = page
    .locator(`time[data-timezone="${timezone}"]:visible`)
    .filter({ hasText: /\d{1,2}:\d{2}/ })
    .first();
  // Timeout généreux et explicite : on attend une HYDRATATION, pas un simple rendu.
  // Sur le build de production d'un runner CI partagé, elle est nettement plus lente
  // qu'en dev local, et le défaut d'`expect` ne suffit pas.
  await expect(dated).toBeVisible({ timeout: 30_000 });
  const text = await dated.innerText();
  const match = text.match(/\b(\d{1,2}):(\d{2})\b/);
  expect(match, `aucune heure "HH:MM" dans "${text}"`).not.toBeNull();
  return Number(match![1]) * 60 + Number(match![2]);
}

/** Écart circulaire en minutes, robuste au passage de minuit (23:30 → 00:30 = 60). */
function minutesApart(later: number, earlier: number): number {
  return (later - earlier + 24 * 60) % (24 * 60);
}

async function readTimeFrom(
  browser: Browser,
  url: string,
  timezoneId: string,
): Promise<number> {
  const context = await browser.newContext({ timezoneId });
  try {
    const page = await context.newPage();
    await page.goto(url);
    // Attend que l'hydratation ait substitué le fuseau du visiteur au repli serveur.
    return await readTimeInMinutes(page, timezoneId);
  } finally {
    await context.close();
  }
}

for (const { name, launcher } of ENGINES) {
  test.describe(`Fuseau du visiteur — ${name}`, () => {
    let browser: Browser;

    test.beforeAll(async () => {
      browser = await launcher.launch();
    });

    test.afterAll(async () => {
      await browser.close();
    });

    test("should show the event one hour later in Paris than in Dublin", async () => {
      const dublin = await readTimeFrom(browser, MOMENT_URL, "Europe/Dublin");
      const paris = await readTimeFrom(browser, MOMENT_URL, "Europe/Paris");

      expect(minutesApart(paris, dublin)).toBe(60);
    });

    test("should show the same time to two visitors sharing a timezone", async () => {
      const first = await readTimeFrom(browser, MOMENT_URL, "Europe/Paris");
      const second = await readTimeFrom(browser, MOMENT_URL, "Europe/Paris");

      expect(first).toBe(second);
    });

    test("should shift the Circle timeline too, not only the event page", async () => {
      const dublin = await readTimeFrom(browser, CIRCLE_URL, "Europe/Dublin");
      const paris = await readTimeFrom(browser, CIRCLE_URL, "Europe/Paris");

      expect(minutesApart(paris, dublin)).toBe(60);
    });

    test("should serve the event's own timezone before hydration", async () => {
      // JavaScript coupé = ce que le serveur a réellement mis dans le HTML, donc
      // exactement ce que voit un visiteur tant que son fuseau n'a pas été lu.
      const context = await browser.newContext({
        timezoneId: "Europe/Dublin",
        javaScriptEnabled: false,
      });
      try {
        const page = await context.newPage();
        await page.goto(MOMENT_URL);

        // Le HTML porte le fuseau de l'ÉVÉNEMENT, pas celui du visiteur irlandais.
        // On compte dans tout le DOM (sans `:visible`) : les branches mobile/desktop
        // coexistent, seule l'absence totale de « Europe/Dublin » fait foi.
        await expect(
          page.locator(`time[data-timezone="${EVENT_TIMEZONE}"]`),
        ).not.toHaveCount(0);
        await expect(page.locator('time[data-timezone="Europe/Dublin"]')).toHaveCount(0);
      } finally {
        await context.close();
      }
    });
  });
}
