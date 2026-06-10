import { describe, expect, it } from "vitest";
import { resolveFirstNamePlaceholders } from "@/lib/email/host-message-placeholders";

describe("resolveFirstNamePlaceholders", () => {
  describe("given a recipient with a first name", () => {
    it("should replace the token with the first name", () => {
      expect(resolveFirstNamePlaceholders("<p>Bonjour {prénom},</p>", "Alice")).toBe(
        "<p>Bonjour Alice,</p>"
      );
    });

    it("should replace every occurrence", () => {
      expect(
        resolveFirstNamePlaceholders("<p>{prénom}, à vendredi {prénom} !</p>", "Alice")
      ).toBe("<p>Alice, à vendredi Alice !</p>");
    });

    it.each([
      ["{prénom}"],
      ["{prenom}"],
      ["{firstName}"],
      ["{firstname}"],
      ["{first name}"],
      ["{Prénom}"],
    ])("should accept the alias %s", (token) => {
      expect(resolveFirstNamePlaceholders(`<p>Bonjour ${token},</p>`, "Alice")).toBe(
        "<p>Bonjour Alice,</p>"
      );
    });

    it("should escape HTML in the first name (injected into markup)", () => {
      expect(
        resolveFirstNamePlaceholders("<p>Bonjour {prénom},</p>", '<img src=x onerror="x">')
      ).not.toContain("<img");
    });

    it("should not interpret $ patterns from String.replace", () => {
      expect(resolveFirstNamePlaceholders("<p>Bonjour {prénom},</p>", "$&Alice")).toBe(
        "<p>Bonjour $&amp;Alice,</p>"
      );
    });
  });

  describe("given a recipient without a first name", () => {
    it.each([[null], [""], ["   "]])(
      "should remove the token and its leading space (firstName = %s)",
      (firstName) => {
        expect(
          resolveFirstNamePlaceholders("<p>Bonjour {prénom},</p>", firstName as string | null)
        ).toBe("<p>Bonjour,</p>");
      }
    );

    it("should remove a token at the start of a sentence without leaving a space", () => {
      expect(resolveFirstNamePlaceholders("<p>{prénom}, à vendredi !</p>", null)).toBe(
        "<p>, à vendredi !</p>"
      );
    });
  });

  describe("given a body without any token", () => {
    it("should return the html unchanged", () => {
      const html = "<p>Bonjour à tous, rendez-vous vendredi.</p>";

      expect(resolveFirstNamePlaceholders(html, "Alice")).toBe(html);
      expect(resolveFirstNamePlaceholders(html, null)).toBe(html);
    });
  });
});
