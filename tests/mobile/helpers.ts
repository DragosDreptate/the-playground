import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Vérifie qu'une page ne génère pas de scroll horizontal.
 * Un scroll horizontal indique un élément qui dépasse la largeur du viewport.
 */
export async function expectNoHorizontalScroll(page: Page) {
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth
  );
  const clientWidth = await page.evaluate(
    () => document.documentElement.clientWidth
  );
  expect(scrollWidth, `Scroll horizontal détecté : scrollWidth=${scrollWidth}px > clientWidth=${clientWidth}px`).toBeLessThanOrEqual(clientWidth);
}

/**
 * Vérifie que tous les éléments interactifs (boutons, liens) ont une zone de
 * touch d'au moins 44px de hauteur (recommandation Apple HIG / WCAG 2.5.5).
 */
export async function expectTouchTargets(page: Page, minHeight = 44) {
  const violations = await page.evaluate((min) => {
    const selectors = ["button", "a[href]", "[role='button']", "input[type='submit']"];
    const elements = document.querySelectorAll<HTMLElement>(selectors.join(","));
    const issues: string[] = [];

    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      // Ignorer les éléments invisibles
      if (rect.width === 0 || rect.height === 0) return;
      if (rect.height < min) {
        const text = el.textContent?.trim().slice(0, 30) ?? el.getAttribute("aria-label") ?? el.tagName;
        issues.push(`"${text}" : ${Math.round(rect.height)}px (min: ${min}px)`);
      }
    });
    return issues;
  }, minHeight);

  expect(violations, `Touch targets trop petits :\n${violations.join("\n")}`).toHaveLength(0);
}

/**
 * Vérifie qu'un élément n'est pas visible (hidden / display:none / hors viewport).
 */
export async function expectHidden(page: Page, selector: string) {
  await expect(page.locator(selector)).toBeHidden();
}

/**
 * Vérifie qu'un élément est visible dans le viewport.
 */
export async function expectVisible(page: Page, selector: string) {
  await expect(page.locator(selector)).toBeVisible();
}
