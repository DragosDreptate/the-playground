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
  it.each([
    ["plain", "Une description simple", "Une description simple"],
    [
      "CRLF",
      "Une communauté\r\n\r\npour OSER\r\n\r\n… à la scène !",
      "Une communauté pour OSER … à la scène !",
    ],
    ["mixed (tabs + LF + multi-spaces)", "foo\t\tbar\n\nbaz   qux", "foo bar baz qux"],
  ])("%s → single-spaced", (_label, input, expected) => {
    expect(collapseWhitespace(input)).toBe(expected);
  });

  it("trims leading and trailing whitespace", () => {
    expect(collapseWhitespace("  \n\n  hello world  \n  ")).toBe("hello world");
  });

  it("returns empty for an empty string", () => {
    expect(collapseWhitespace("")).toBe("");
  });

  it("returns empty for whitespace-only input", () => {
    expect(collapseWhitespace("   \n\t\r\n  ")).toBe("");
  });
});
