import { describe, it, expect } from "vitest";
import { countSentToday, quotaTier } from "@/lib/resend-quota";

describe("countSentToday", () => {
  const today = "2026-06-03";

  it("ne compte que les emails du jour UTC (frontière minuit)", () => {
    const emails = [
      { created_at: "2026-06-03 18:18:22.509285+00" }, // aujourd'hui
      { created_at: "2026-06-03 00:00:01.000000+00" }, // aujourd'hui, juste après minuit UTC
      { created_at: "2026-06-02 23:59:59.000000+00" }, // hier, juste avant minuit UTC
      { created_at: "2026-06-01 12:00:00.000000+00" }, // avant-hier
    ];
    expect(countSentToday(emails, today)).toBe(2);
  });

  it("renvoie 0 sur une liste vide", () => {
    expect(countSentToday([], today)).toBe(0);
  });
});

describe("quotaTier", () => {
  it.each([
    [0, null],
    [69, null],
    [70, 70],
    [89, 70],
    [90, 90],
    [100, 90],
  ])("used=%i → palier %s", (used, expected) => {
    expect(quotaTier(used as number)).toBe(expected as 70 | 90 | null);
  });
});
