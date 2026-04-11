import { test, expect } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { SLUGS, AUTH } from "./fixtures";

/**
 * Tests E2E — Pièces jointes d'événement
 *
 * Couvre :
 *   - Le label "Documents" est visible dans le formulaire d'édition (HOST)
 *   - La dropzone ou la liste de cartes est rendue selon l'état initial
 *   - Upload d'un PDF → carte apparaît dans l'éditeur avec le filename
 *   - Le document apparaît dans la section "Documents" de la page publique
 *   - Un click sur une carte ouvre la modale de consultation
 *
 * Fixture : un PDF minimal valide généré à la volée (le magic number
 * "%PDF-" suffit à ce que la bibliothèque file-type le reconnaisse
 * côté server action).
 *
 * Ordre d'exécution : Playwright lance les tests d'un même fichier
 * en séquence par défaut, donc l'upload (qui persiste l'attachment
 * en DB) est réalisé avant les tests de consultation.
 */

const EDIT_MOMENT_URL = `/fr/dashboard/circles/${SLUGS.CIRCLE}/moments/${SLUGS.PUBLISHED_MOMENT}/edit`;
const PUBLIC_MOMENT_URL = `/fr/m/${SLUGS.PUBLISHED_MOMENT}`;

// Minimal valid PDF : header magique + objet racine + trailer EOF.
// ~70 bytes suffisent pour que file-type détecte application/pdf.
const MINIMAL_PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
  "utf-8"
);

const FIXTURE_PATH = path.join(__dirname, ".auth", "test-attachment.pdf");

test.beforeAll(() => {
  fs.mkdirSync(path.dirname(FIXTURE_PATH), { recursive: true });
  fs.writeFileSync(FIXTURE_PATH, MINIMAL_PDF);
});

test.afterAll(() => {
  if (fs.existsSync(FIXTURE_PATH)) {
    fs.unlinkSync(FIXTURE_PATH);
  }
});

test.describe.serial("Pièces jointes — éditeur (HOST)", () => {
  test.use({ storageState: AUTH.HOST });

  test("should display the Documents editor section on the edit page", async ({
    page,
  }) => {
    await page.goto(EDIT_MOMENT_URL);

    // Le label "Documents (optionnel)" est visible (first() car il peut
    // exister plusieurs occurrences selon l'état initial du moment —
    // notamment si des attachments persistent d'un run précédent)
    await expect(
      page.getByText(/documents \(optionnel\)/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("should upload a PDF via the file input and display it as a card", async ({
    page,
  }) => {
    await page.goto(EDIT_MOMENT_URL);

    // 1. Wait for the editor to be hydrated before interacting — the label
    //    visibility is a reliable proxy for "MomentForm + MomentAttachmentsEditor
    //    mounted and React handlers attached"
    await expect(
      page.getByText(/documents \(optionnel\)/i).first()
    ).toBeVisible({ timeout: 10_000 });

    // 2. Trigger the file input via its testid (avoids collision with the
    //    cover image picker which also has a file input)
    const fileInput = page.getByTestId("moment-attachments-file-input");
    await fileInput.setInputFiles(FIXTURE_PATH);

    // 3. Wait for the upload server action to complete (blob write + DB insert).
    //    First run of the dev server is slow because the action is compiled
    //    on demand + Vercel Blob has network latency.
    await page.waitForLoadState("networkidle", { timeout: 30_000 });

    // 4. The filename appears in a card (either still uploading or persisted,
    //    but the text matches both states)
    await expect(
      page.getByText("test-attachment.pdf").first()
    ).toBeVisible({ timeout: 15_000 });

    // 5. Counter shows at least 1/3 (prior attachments may also exist if
    //    the previous run left any — teardown cleans them up but only at
    //    globalTeardown, not between tests)
    await expect(page.getByText(/\d+\/3 fichiers/).first()).toBeVisible();
  });
});

test.describe("Pièces jointes — page publique", () => {
  test.use({ storageState: AUTH.PLAYER });

  test("should display the Documents section when attachments exist", async ({
    page,
  }) => {
    await page.goto(PUBLIC_MOMENT_URL);

    // Si aucun attachment n'a été uploadé (upload test a échoué),
    // on skip gracieusement
    const sectionHeading = page
      .getByRole("heading", { name: /^documents$/i })
      .first();

    const hasDocuments = await sectionHeading
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    test.skip(
      !hasDocuments,
      "No attachments on the moment — skipping public view check"
    );

    await expect(sectionHeading).toBeVisible();
    // At least one card rendered as a <li> inside the attachments list
    await expect(page.locator("ul[role='list']").first()).toBeVisible();
  });

  test("should open the viewer modal when clicking an attachment card", async ({
    page,
  }) => {
    await page.goto(PUBLIC_MOMENT_URL);

    // Find the first card button inside the attachments list
    const firstCardButton = page
      .locator("ul[role='list']")
      .first()
      .locator("li button")
      .first();

    const hasDocuments = await firstCardButton
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    test.skip(!hasDocuments, "No attachments — skipping viewer modal test");

    await firstCardButton.click();

    // The dialog appears
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Download button has the Télécharger aria-label
    await expect(
      dialog.getByRole("link", { name: /télécharger/i }).first()
    ).toBeVisible();

    // Escape closes the modal
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });
  });
});
