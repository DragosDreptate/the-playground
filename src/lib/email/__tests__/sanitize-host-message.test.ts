import { describe, expect, it } from "vitest";
import {
  extractHostMessageTextLength,
  sanitizeHostMessageHtml,
} from "@/lib/email/sanitize-host-message";
import { HOST_MESSAGE_BODY_MAX_TEXT_LENGTH } from "@/domain/models/registration";

describe("sanitizeHostMessageHtml", () => {
  describe("given allowed rich text markup", () => {
    it("should keep paragraphs, emphasis and lists untouched", () => {
      const html =
        "<p>Salle <strong>Horizon</strong>, <em>2e étage</em></p><ul><li>18h30</li></ul><ol><li>Talks</li></ol>";

      const result = sanitizeHostMessageHtml(html);

      expect(result).toContain("<strong>Horizon</strong>");
      expect(result).toContain("<em>2e étage</em>");
      expect(result).toContain("<ul><li>18h30</li></ul>");
      expect(result).toContain("<ol><li>Talks</li></ol>");
    });

    it("should keep links and add email-safe inline styling", () => {
      const result = sanitizeHostMessageHtml('<p><a href="https://example.com">infos</a></p>');

      expect(result).toContain('href="https://example.com"');
      expect(result).toContain("color: #ec4899");
      expect(result).toContain('rel="noopener noreferrer"');
    });
  });

  describe("given hostile markup", () => {
    it.each([
      ["a script tag", "<p>ok</p><script>alert(1)</script>", "<script"],
      ["an image", '<img src="https://evil.test/pixel.png">', "<img"],
      ["an iframe", '<iframe src="https://evil.test"></iframe>', "<iframe"],
      ["a heading", "<h1>gros titre</h1>", "<h1"],
    ])("should strip %s", (_label, html, forbidden) => {
      const result = sanitizeHostMessageHtml(html);

      expect(result).not.toContain(forbidden);
    });

    it("should strip inline event handlers", () => {
      const result = sanitizeHostMessageHtml('<p onclick="alert(1)">texte</p>');

      expect(result).not.toContain("onclick");
      expect(result).toContain("texte");
    });

    it("should neutralize javascript: links", () => {
      const result = sanitizeHostMessageHtml('<a href="javascript:alert(1)">clic</a>');

      expect(result).not.toContain("javascript:");
    });

    it("should strip incoming style attributes outside the enforced link style", () => {
      const result = sanitizeHostMessageHtml('<p style="font-size:80px">gros</p>');

      expect(result).toBe("<p>gros</p>");
    });
  });
});

describe("extractHostMessageTextLength", () => {
  it("should count only the text content, tags excluded", () => {
    expect(extractHostMessageTextLength("<p><strong>abc</strong> def</p>")).toBe(7);
  });

  it("should return 0 for markup without text (Tiptap empty document)", () => {
    expect(extractHostMessageTextLength("<p></p>")).toBe(0);
  });

  it("should detect bodies above the maximum length", () => {
    const html = `<p>${"x".repeat(HOST_MESSAGE_BODY_MAX_TEXT_LENGTH + 1)}</p>`;

    expect(extractHostMessageTextLength(html)).toBeGreaterThan(
      HOST_MESSAGE_BODY_MAX_TEXT_LENGTH
    );
  });
});
