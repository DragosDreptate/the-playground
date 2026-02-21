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

/**
 * Vérifie que deux éléments sont empilés verticalement (pas côte à côte).
 * Utile pour les layouts 2 colonnes qui doivent passer en colonne unique sur mobile.
 */
export async function expectStackedLayout(page: Page, topSelector: string, bottomSelector: string) {
  const top = page.locator(topSelector).first();
  const bottom = page.locator(bottomSelector).first();

  await expect(top).toBeVisible();
  await expect(bottom).toBeVisible();

  const topBox = await top.boundingBox();
  const bottomBox = await bottom.boundingBox();

  expect(topBox, `Élément "${topSelector}" n'a pas de bounding box`).not.toBeNull();
  expect(bottomBox, `Élément "${bottomSelector}" n'a pas de bounding box`).not.toBeNull();

  if (topBox && bottomBox) {
    expect(
      bottomBox.y,
      `Les éléments sont côte à côte au lieu d'être empilés : top.y=${topBox.y}, bottom.y=${bottomBox.y}`
    ).toBeGreaterThanOrEqual(topBox.y + topBox.height * 0.5);
  }
}

/**
 * Vérifie qu'un élément ne déborde pas de son conteneur (pas de troncature).
 */
export async function expectNotOverflowing(page: Page, selector: string) {
  const el = page.locator(selector).first();
  await expect(el).toBeVisible();

  const overflow = await el.evaluate((node) => {
    return node.scrollWidth > node.clientWidth;
  });

  expect(overflow, `L'élément "${selector}" déborde horizontalement`).toBe(false);
}
