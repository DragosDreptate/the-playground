import { describe, it, expect } from "vitest";
import {
  countSentToday,
  quotaTier,
  shouldNotifyQuota,
  type QuotaAlertState,
  type QuotaTier,
} from "@/lib/resend-quota";

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
    [99, 90],
    [100, 100],
    [120, 100],
  ])("used=%i → palier %s", (used, expected) => {
    expect(quotaTier(used as number)).toBe(expected as QuotaTier | null);
  });
});

describe("shouldNotifyQuota", () => {
  const today = "2026-06-24";

  it("notifie au premier franchissement du jour (aucun état)", () => {
    expect(shouldNotifyQuota(70, today, undefined)).toBe(true);
  });

  it("ne re-notifie pas un palier déjà notifié aujourd'hui", () => {
    const state: QuotaAlertState = { date: today, tier: 70 };
    expect(shouldNotifyQuota(70, today, state)).toBe(false);
  });

  it("notifie la montée vers un palier supérieur (70 → 90 → 100)", () => {
    expect(shouldNotifyQuota(90, today, { date: today, tier: 70 })).toBe(true);
    expect(shouldNotifyQuota(100, today, { date: today, tier: 90 })).toBe(true);
  });

  it("ne notifie pas un palier inférieur déjà couvert (jamais le cas en pratique)", () => {
    expect(shouldNotifyQuota(70, today, { date: today, tier: 90 })).toBe(false);
  });

  it("re-notifie un nouveau jour UTC, même palier (reset implicite à minuit)", () => {
    const veille: QuotaAlertState = { date: "2026-06-23", tier: 100 };
    expect(shouldNotifyQuota(70, today, veille)).toBe(true);
  });
});
