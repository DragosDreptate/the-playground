import { describe, it, expect } from "vitest";
import { generateSlug } from "@/lib/slug";

describe("generateSlug", () => {
  it.each([
    ["My Circle", "my-circle"],
    ["  Hello World  ", "hello-world"],
    ["café résumé", "cafe-resume"],
    ["événements à Paris", "evenements-a-paris"],
    ["L'été français", "l-ete-francais"],
    ["Hello---World", "hello-world"],
    ["Hello & World!", "hello-world"],
    ["123 Numbers", "123-numbers"],
    ["UPPERCASE", "uppercase"],
    ["  --dashes--  ", "dashes"],
    ["a".repeat(100), "a".repeat(80)],
  ])("should slugify %j to %j", (input, expected) => {
    expect(generateSlug(input)).toBe(expected);
  });

  it("should handle empty-ish input gracefully", () => {
    expect(generateSlug("   ")).toBe("");
    expect(generateSlug("---")).toBe("");
  });
});
