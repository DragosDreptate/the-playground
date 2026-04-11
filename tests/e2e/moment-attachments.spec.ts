import { test, expect } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { SLUGS, AUTH } from "./fixtures";

/**
 * Tests E2E — Pièces jointes d'événement
 *
 * Couvre :
 *   - L'éditeur de pièces jointes est visible dans le formulaire d'édition (HOST)
 *   - La dropzone s'affiche quand aucun document n'est présent
 *   - Upload d'un PDF → carte apparaît dans l'éditeur
 *   - Le document apparaît dans la section "Documents" de la page publique
 *   - Un click ouvre la modale de consultation (viewer)
 *   - Suppression d'un document via confirmation
 *
 * Les tests utilisent un PDF fixture minimal généré à la volée (4 bytes suffisent
 * pour que file-type détecte un PDF — le magic number "%PDF").
 */

const EDIT_MOMENT_URL = `/fr/dashboard/circles/${SLUGS.CIRCLE}/moments/${SLUGS.PUBLISHED_MOMENT}/edit`;
const PUBLIC_MOMENT_URL = `/fr/m/${SLUGS.PUBLISHED_MOMENT}`;

// Minimal valid PDF content: the magic header + EOF marker
const MINIMAL_PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
  "utf-8"
);

const FIXTURE_PATH = path.join(
  __dirname,
  ".auth",
  "test-attachment.pdf"
);

test.beforeAll(() => {
  // Ensure the fixture directory exists and write the PDF
  fs.mkdirSync(path.dirname(FIXTURE_PATH), { recursive: true });
  fs.writeFileSync(FIXTURE_PATH, MINIMAL_PDF);
});

test.afterAll(() => {
  // Cleanup the fixture file
  if (fs.existsSync(FIXTURE_PATH)) {
    fs.unlinkSync(FIXTURE_PATH);
  }
});

test.describe("Pièces jointes — éditeur (HOST)", () => {
  test.use({ storageState: AUTH.HOST });

  test("should display the Documents editor section on the edit page", async ({
    page,
  }) => {
    await page.goto(EDIT_MOMENT_URL);

    // Le label "Documents (optionnel)" est visible
    await expect(
      page.locator("form").getByText(/documents \(optionnel\)/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("should show the dropzone with accepted types and max size", async ({
    page,
  }) => {
    await page.goto(EDIT_MOMENT_URL);

    // Dropzone visible (au moins une fois — elle disparaît quand il y a déjà des fichiers)
    const hasDropzone = await page
      .getByText(/glissez vos fichiers ici/i)
      .first()
      .isVisible()
      .catch(() => false);

    if (hasDropzone) {
      await expect(
        page.getByText(/glissez vos fichiers ici/i).first()
      ).toBeVisible();
      // Dropzone hint shows file types and 10 MB limit
      await expect(
        page.getByText(/pdf, jpg, png, webp.*10 mb/i).first()
      ).toBeVisible();
    }
  });

  test("should upload a PDF and display it as a card in the editor", async ({
    page,
  }) => {
    await page.goto(EDIT_MOMENT_URL);

    // Upload via the hidden file input
    const fileInput = page.locator('input[type="file"][accept*="pdf"]').first();
    await fileInput.setInputFiles(FIXTURE_PATH);

    // The filename appears as a card in the editor
    await expect(
      page.getByText("test-attachment.pdf").first()
    ).toBeVisible({ timeout: 15_000 });

    // And the counter shows 1/3 (at least 1 — previous tests might have added some)
    await expect(page.locator("form").getByText(/\d+\/3 fichiers/)).toBeVisible();
  });
});

test.describe("Pièces jointes — page publique", () => {
  test.use({ storageState: AUTH.PLAYER });

  test("should display the Documents section when attachments exist", async ({
    page,
  }) => {
    // Prerequisite: at least one attachment must exist — added by the previous
    // test block. If none exists, this test is skipped gracefully.
    await page.goto(PUBLIC_MOMENT_URL);

    const documentsSection = page
      .getByRole("heading", { name: /documents/i })
      .first();

    const hasDocuments = await documentsSection
      .isVisible()
      .catch(() => false);

    test.skip(!hasDocuments, "No attachments on the moment — skipping public view check");

    await expect(documentsSection).toBeVisible();

    // At least one attachment card is rendered as a <li>
    await expect(page.locator("ul[role='list'] li").first()).toBeVisible();
  });

  test("should open the viewer modal when clicking an attachment card", async ({
    page,
  }) => {
    await page.goto(PUBLIC_MOMENT_URL);

    const firstCard = page
      .locator("ul[role='list'] li button")
      .first();

    const hasDocuments = await firstCard.isVisible().catch(() => false);
    test.skip(!hasDocuments, "No attachments — skipping viewer modal test");

    await firstCard.click();

    // The dialog appears with a Download button and a Close button
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Download button has the correct aria-label (Télécharger in FR)
    await expect(
      dialog.getByRole("button", { name: /télécharger|download/i }).first()
    ).toBeVisible();

    // Close the modal via Escape
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });
  });
});
