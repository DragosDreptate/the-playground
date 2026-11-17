import { describe, it, expect } from "vitest";
import robots from "../robots";
import { AI_TRAINING_BOTS } from "@/lib/blocked-bots";

function asArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

describe("robots.txt", () => {
  const rules = asArray(robots().rules as never) as unknown as {
    userAgent: string | string[];
    allow?: string | string[];
    disallow?: string | string[];
  }[];
  const ruleFor = (agent: string) =>
    rules.find((rule) => asArray(rule.userAgent).includes(agent))!;

  describe("given an ordinary crawler (Google Agenda, aggregators)", () => {
    it("should allow the Community calendar feed despite /api/ being private", () => {
      const rule = ruleFor("*");

      expect(asArray(rule.disallow)).toContain("/api/");
      expect(asArray(rule.allow)).toContain("/api/circles/*/calendar");
    });
  });

  describe("given an AI training bot", () => {
    it("should keep /api/ disallowed, calendar feed included", () => {
      const rule = ruleFor(AI_TRAINING_BOTS[0]);

      expect(asArray(rule.disallow)).toContain("/api/");
      expect(asArray(rule.allow)).not.toContain("/api/circles/*/calendar");
    });
  });
});
