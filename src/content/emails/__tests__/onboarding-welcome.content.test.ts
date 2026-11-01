import { describe, it, expect } from "vitest";
import { getOnboardingWelcomeContent } from "../onboarding-welcome.content";

// Lit les vrais fichiers de la lettre : une coquille de structure (frontmatter,
// intertitre de fin, encadré) doit casser ce test, pas arriver chez un utilisateur.
describe("getOnboardingWelcomeContent", () => {
  describe.each([
    ["fr", "Merci d'avoir rejoint The Playground !", "Bonjour {firstName},"],
    ["en", "Thanks for joining The Playground!", "Hi {firstName},"],
  ])("given the %s letter", (locale, subject, greeting) => {
    const content = getOnboardingWelcomeContent(locale);

    it("should parse the frontmatter", () => {
      expect(content.subject).toBe(subject);
      expect(content.greeting).toBe(greeting);
      expect(content.replyTo).toBe("dragos@the-playground.fr");
    });

    it("should parse the full structure: intro, two sections, highlight and closing", () => {
      expect(content.intro.length).toBeGreaterThan(0);
      expect(content.sections).toHaveLength(2);
      expect(content.highlight).toBeTruthy();
      expect(content.conclusion).toBeTruthy();
      expect(content.closingParagraphs).toHaveLength(2);
    });
  });

  it("should fall back to the French letter for an unsupported language", () => {
    expect(getOnboardingWelcomeContent("nl")).toBe(getOnboardingWelcomeContent("fr"));
  });
});
