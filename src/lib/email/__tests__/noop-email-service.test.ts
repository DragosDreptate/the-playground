import { describe, expect, it } from "vitest";
import { createNoopEmailService } from "../noop-email-service";

describe("createNoopEmailService", () => {
  it("resolves email sends without side effects", async () => {
    const emailService = createNoopEmailService();

    await expect(
      emailService.sendAdminEntityCreated({
        to: "admin@the-playground.fr",
        entityType: "circle",
        entityName: "Paris Creative Tech",
        creatorName: "Alice",
        creatorEmail: "alice@example.com",
        entityUrl: "http://localhost:3000/dashboard/circles/paris-creative-tech",
        strings: {
          subject: "New circle",
          heading: "New circle",
          message: "A new circle was created.",
          ctaLabel: "Open",
          footer: "Admin notification",
        },
      })
    ).resolves.toBeUndefined();
  });
});
