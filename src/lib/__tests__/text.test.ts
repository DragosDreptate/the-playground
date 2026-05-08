import { describe, it, expect } from "vitest";
import { truncate, collapseWhitespace } from "@/lib/text";

describe("truncate", () => {
  it("returns the string unchanged when below the cap", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("returns the string unchanged when at the cap", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });

  it("truncates with ellipsis when above the cap", () => {
    expect(truncate("Bonjour le monde", 10)).toBe("Bonjour l…");
  });

  it("counts the ellipsis in the max length", () => {
    expect(truncate("abcdef", 4).length).toBe(4);
  });
});

describe("collapseWhitespace", () => {
  it("returns the string unchanged when no whitespace mess", () => {
    expect(collapseWhitespace("Une description simple")).toBe(
      "Une description simple",
    );
  });

  describe("given a description with newlines (CRLF)", () => {
    it("replaces them with a single space", () => {
      expect(
        collapseWhitespace("Une communauté\r\n\r\npour OSER\r\n\r\n… à la scène !"),
      ).toBe("Une communauté pour OSER … à la scène !");
    });
  });

  describe("given a description with mixed whitespace", () => {
    it("collapses tabs, newlines and multiple spaces into one", () => {
      expect(collapseWhitespace("foo\t\tbar\n\nbaz   qux")).toBe("foo bar baz qux");
    });
  });

  describe("given leading/trailing whitespace", () => {
    it("trims the result", () => {
      expect(collapseWhitespace("  \n\n  hello world  \n  ")).toBe("hello world");
    });
  });

  describe("given an empty string", () => {
    it("returns empty", () => {
      expect(collapseWhitespace("")).toBe("");
    });
  });

  describe("given only whitespace", () => {
    it("returns empty", () => {
      expect(collapseWhitespace("   \n\t\r\n  ")).toBe("");
    });
  });
});
