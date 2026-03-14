import { describe, it, expect } from "vitest";
import { linkifyText } from "../linkify";

describe("linkifyText", () => {
  describe("given plain text without URLs", () => {
    it("should return the text as a single string node", () => {
      const result = linkifyText("Bonjour tout le monde");
      expect(result).toEqual(["Bonjour tout le monde"]);
    });

    it("should return an empty array for empty string", () => {
      const result = linkifyText("");
      expect(result).toEqual([]);
    });

    it("should preserve whitespace and newlines", () => {
      const result = linkifyText("ligne 1\nligne 2\n\nligne 3");
      expect(result).toEqual(["ligne 1\nligne 2\n\nligne 3"]);
    });
  });

  describe("given text with a single URL", () => {
    it("should return a link node for a bare https URL", () => {
      const result = linkifyText("https://example.com");
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ props: { href: "https://example.com" } });
    });

    it("should return a link node for a bare http URL", () => {
      const result = linkifyText("http://example.com");
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ props: { href: "http://example.com" } });
    });

    it("should split text before and after the URL", () => {
      const result = linkifyText("Voir ici : https://example.com merci");
      expect(result).toHaveLength(3);
      expect(result[0]).toBe("Voir ici : ");
      expect(result[1]).toMatchObject({ props: { href: "https://example.com" } });
      expect(result[2]).toBe(" merci");
    });

    it("should open links in a new tab with noopener noreferrer", () => {
      const result = linkifyText("https://example.com");
      const link = result[0] as React.ReactElement<{ target: string; rel: string }>;
      expect(link.props.target).toBe("_blank");
      expect(link.props.rel).toBe("noopener noreferrer");
    });
  });

  describe("given text with multiple URLs", () => {
    it("should convert all URLs to links", () => {
      const result = linkifyText("Site A : https://a.com et site B : https://b.com");
      expect(result).toHaveLength(4);
      expect(result[1]).toMatchObject({ props: { href: "https://a.com" } });
      expect(result[3]).toMatchObject({ props: { href: "https://b.com" } });
    });

    it("should handle two consecutive URLs separated by space", () => {
      const result = linkifyText("https://first.com https://second.com");
      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({ props: { href: "https://first.com" } });
      expect(result[2]).toMatchObject({ props: { href: "https://second.com" } });
    });
  });

  describe("given URLs with path and query params", () => {
    it("should preserve full URL with path", () => {
      const result = linkifyText("https://example.com/path/to/page");
      expect(result[0]).toMatchObject({ props: { href: "https://example.com/path/to/page" } });
    });

    it("should preserve URL with query params", () => {
      const result = linkifyText("https://example.com/search?q=foo&lang=fr");
      expect(result[0]).toMatchObject({ props: { href: "https://example.com/search?q=foo&lang=fr" } });
    });

    it("should strip trailing punctuation (period)", () => {
      const result = linkifyText("Voir https://example.com.");
      expect(result[1]).toMatchObject({ props: { href: "https://example.com" } });
      expect(result[2]).toBe(".");
    });

    it("should strip trailing punctuation (comma)", () => {
      const result = linkifyText("Voir https://example.com, et autre chose.");
      expect(result[1]).toMatchObject({ props: { href: "https://example.com" } });
    });

    it("should strip trailing closing parenthesis", () => {
      const result = linkifyText("(voir https://example.com)");
      expect(result[1]).toMatchObject({ props: { href: "https://example.com" } });
    });
  });

  describe("given text with non-http protocols", () => {
    it("should NOT linkify ftp:// URLs", () => {
      const result = linkifyText("ftp://example.com");
      expect(result).toEqual(["ftp://example.com"]);
    });

    it("should NOT linkify mailto: links", () => {
      const result = linkifyText("mailto:test@example.com");
      expect(result).toEqual(["mailto:test@example.com"]);
    });
  });

  describe("security — XSS attempts", () => {
    it("should not execute javascript: protocol", () => {
      const result = linkifyText("javascript:alert('xss')");
      expect(result).toEqual(["javascript:alert('xss')"]);
    });

    it("should treat <script> tags as plain text (React escapes automatically)", () => {
      const result = linkifyText("<script>alert('xss')</script>");
      expect(result).toEqual(["<script>alert('xss')</script>"]);
    });

    it("should handle URL followed by HTML-like content safely", () => {
      const result = linkifyText("https://example.com <b>gras</b>");
      expect(result[0]).toMatchObject({ props: { href: "https://example.com" } });
      expect(result[1]).toBe(" <b>gras</b>");
    });
  });
});
