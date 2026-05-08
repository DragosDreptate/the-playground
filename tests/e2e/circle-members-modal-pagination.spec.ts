import { test, expect } from "@playwright/test";
import { SLUGS, AUTH } from "./fixtures";
import { openCircleMembersDialog } from "./helpers/circle-members";

/**
 * Tests E2E — Pagination de la modale CircleMembersDialog
 *
 * Régression : sur un Circle avec > PAGE_SIZE (20) membres, la première page
 * était la seule chargée. L'IntersectionObserver de l'infinite scroll observait
 * le viewport global au lieu du conteneur scrollable de la modale, donc le
 * sentinel ne devenait jamais "intersecting" et loadMore() n'était jamais
 * déclenché.
 *
 * Ce test exerce le scénario : Circle "test-large-members" avec 22 membres
 * (1 HOST + 21 PLAYERS) → le 21e PLAYER (LargeMember21) tombe en page 2 et
 * doit apparaître après scroll dans le conteneur de la modale.
 */

test.describe("Modale membres — pagination infinite scroll", () => {
  test.use({ storageState: AUTH.HOST });

  test("should load all members of a Circle with > PAGE_SIZE members via infinite scroll", async ({ page }) => {
    await page.goto(`/fr/circles/${SLUGS.LARGE_MEMBERS_CIRCLE}`);

    const dialog = await openCircleMembersDialog(page);
    await expect(dialog).toContainText("22 membres");

    // À l'ouverture, seule la page 1 est chargée (20 membres) → LargeMember21
    // (en page 2) ne doit pas être présent dans le DOM. Match exact pour
    // éviter qu'un futur LargeMember210 ne fasse passer l'assertion par erreur.
    const lastMember = dialog.getByText("LargeMember21 Test", { exact: true });
    await expect(lastMember).toHaveCount(0);

    // Scroll le conteneur de la modale jusqu'en bas pour déclencher l'observer
    const scrollContainer = dialog.getByTestId("circle-members-scroll-container");
    await scrollContainer.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });

    // LargeMember21 doit maintenant apparaître. Si l'infinite scroll est
    // cassé, ce test timeout.
    await expect(lastMember).toBeVisible();

    // Et le sentinel disparaît (hasMore = false) une fois tous les membres chargés
    await expect(dialog.getByTestId("circle-members-sentinel")).toHaveCount(0);
  });
});
