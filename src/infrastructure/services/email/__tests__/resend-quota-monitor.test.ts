import { describe, it, expect, vi, beforeEach } from "vitest";

const notifySlackQuotaWarningMock = vi.fn();

vi.mock("../../slack/slack-notification-service", () => ({
  notifySlackQuotaWarning: (used: number, tier: number) =>
    notifySlackQuotaWarningMock(used, tier),
}));

import { checkResendQuota, __resetForTests } from "../resend-quota-monitor";

function headers(used: number | string): Record<string, string> {
  return { "x-resend-daily-quota": String(used) };
}

describe("checkResendQuota", () => {
  beforeEach(() => {
    __resetForTests();
    notifySlackQuotaWarningMock.mockReset();
  });

  describe("given le quota est sous le premier seuil", () => {
    it("should ne pas alerter", async () => {
      await checkResendQuota(headers(42));
      expect(notifySlackQuotaWarningMock).not.toHaveBeenCalled();
    });
  });

  describe("given le quota franchit 70", () => {
    it("should alerter une fois au palier 70", async () => {
      await checkResendQuota(headers(72));
      expect(notifySlackQuotaWarningMock).toHaveBeenCalledExactlyOnceWith(72, 70);
    });

    it("should ne pas re-alerter tant qu'on reste dans le palier 70", async () => {
      await checkResendQuota(headers(72));
      await checkResendQuota(headers(80));
      await checkResendQuota(headers(89));
      expect(notifySlackQuotaWarningMock).toHaveBeenCalledExactlyOnceWith(72, 70);
    });
  });

  describe("given le quota franchit 90", () => {
    it("should alerter au palier 90 après le palier 70", async () => {
      await checkResendQuota(headers(72));
      await checkResendQuota(headers(91));
      expect(notifySlackQuotaWarningMock).toHaveBeenCalledTimes(2);
      expect(notifySlackQuotaWarningMock).toHaveBeenLastCalledWith(91, 90);
    });

    it("should alerter directement au palier 90 si on saute par-dessus 70", async () => {
      await checkResendQuota(headers(95));
      expect(notifySlackQuotaWarningMock).toHaveBeenCalledExactlyOnceWith(95, 90);
    });
  });

  describe("given le header de quota est absent ou invalide", () => {
    it.each([
      ["headers null", null],
      ["headers undefined", undefined],
      ["header manquant", {} as Record<string, string>],
      ["valeur non numérique", { "x-resend-daily-quota": "n/a" }],
    ])("should ne rien faire (%s)", async (_label, h) => {
      await checkResendQuota(h);
      expect(notifySlackQuotaWarningMock).not.toHaveBeenCalled();
    });
  });

  describe("given le quota redescend (nouveau jour, reset Resend à minuit)", () => {
    it("should se réarmer et ré-alerter au palier 70 le lendemain", async () => {
      await checkResendQuota(headers(72)); // jour 1 : alerte 70
      await checkResendQuota(headers(5)); // lendemain : quota remis à zéro puis 5 emails
      await checkResendQuota(headers(75)); // jour 2 : franchit de nouveau 70

      expect(notifySlackQuotaWarningMock).toHaveBeenCalledTimes(2);
      expect(notifySlackQuotaWarningMock).toHaveBeenNthCalledWith(1, 72, 70);
      expect(notifySlackQuotaWarningMock).toHaveBeenNthCalledWith(2, 75, 70);
    });
  });
});
