import { type Locator, type Page, expect } from "@playwright/test";

/**
 * Ouvre la modale Membres via le bloc stats "X Membres" et retourne le dialog.
 * Fonctionne aussi bien sur la page publique du Circle que sur le dashboard.
 */
export async function openCircleMembersDialog(page: Page): Promise<Locator> {
  const trigger = page.getByRole("button", { name: /\d+ membres?/i }).first();
  await expect(trigger).toBeVisible();
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}
