import { describe, it, expect } from "vitest";
import { isUpcomingCancelled, isPastMoment, byStartsAtDesc } from "@/lib/moment-timeline";

const NOW = new Date("2026-06-25T12:00:00Z").getTime();
const future = new Date("2026-07-23T20:00:00Z");
const past = new Date("2026-05-01T20:00:00Z");

describe("moment-timeline", () => {
  describe("isUpcomingCancelled", () => {
    it("given a CANCELLED moment dated in the future, should be treated as upcoming", () => {
      expect(isUpcomingCancelled({ status: "CANCELLED", startsAt: future }, NOW)).toBe(true);
    });

    it("given a CANCELLED moment dated in the past, should not be upcoming", () => {
      expect(isUpcomingCancelled({ status: "CANCELLED", startsAt: past }, NOW)).toBe(false);
    });

    it.each(["PUBLISHED", "PAST", "DRAFT"])(
      "given a %s moment, should never be upcoming-cancelled",
      (status) => {
        expect(isUpcomingCancelled({ status, startsAt: future }, NOW)).toBe(false);
      }
    );
  });

  describe("isPastMoment", () => {
    it("given a PAST moment, should belong to history", () => {
      expect(isPastMoment({ status: "PAST", startsAt: past }, NOW)).toBe(true);
    });

    it("given a CANCELLED moment dated in the past, should belong to history", () => {
      expect(isPastMoment({ status: "CANCELLED", startsAt: past }, NOW)).toBe(true);
    });

    it("given a CANCELLED moment dated in the future, should NOT belong to history", () => {
      expect(isPastMoment({ status: "CANCELLED", startsAt: future }, NOW)).toBe(false);
    });

    it.each(["PUBLISHED", "DRAFT"])(
      "given a %s moment, should not belong to history",
      (status) => {
        expect(isPastMoment({ status, startsAt: past }, NOW)).toBe(false);
      }
    );
  });

  describe("byStartsAtDesc", () => {
    it("should order the most recent first", () => {
      const a = { startsAt: new Date("2026-01-01") };
      const b = { startsAt: new Date("2026-03-01") };
      const c = { startsAt: new Date("2026-02-01") };
      expect([a, b, c].sort(byStartsAtDesc)).toEqual([b, c, a]);
    });
  });
});
