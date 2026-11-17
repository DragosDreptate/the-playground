import { describe, it, expect, vi } from "vitest";
import {
  CALENDAR_FEED_PAST_DAYS,
  getCircleCalendarMoments,
} from "@/domain/usecases/get-circle-calendar-moments";
import type { MomentStatus } from "@/domain/models/moment";
import {
  createMockMomentRepository,
  makeMoment,
} from "./helpers/mock-moment-repository";

const NOW = new Date("2026-11-17T12:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function daysFromNow(days: number): Date {
  return new Date(NOW.getTime() + days * DAY_MS);
}

async function runWith(moments: ReturnType<typeof makeMoment>[]) {
  const momentRepository = createMockMomentRepository({
    findByCircleId: vi.fn().mockResolvedValue(moments),
  });
  const result = await getCircleCalendarMoments(
    "circle-1",
    { momentRepository },
    NOW
  );
  return { result, momentRepository };
}

describe("GetCircleCalendarMoments", () => {
  describe("given a Circle with Moments in every status", () => {
    it.each<[MomentStatus, boolean]>([
      ["PUBLISHED", true],
      ["CANCELLED", true],
      ["PAST", true],
      ["DRAFT", false],
    ])("should include a %s Moment in the feed: %s", async (status, included) => {
      const { result } = await runWith([
        makeMoment({ id: "m1", status, startsAt: daysFromNow(7) }),
      ]);

      expect(result.map((m) => m.id)).toEqual(included ? ["m1"] : []);
    });

    it("should load the Moments of the requested Circle", async () => {
      const { momentRepository } = await runWith([]);

      expect(momentRepository.findByCircleId).toHaveBeenCalledWith("circle-1");
    });
  });

  describe("given past Moments", () => {
    it.each([
      ["yesterday", -1, true],
      [`${CALENDAR_FEED_PAST_DAYS} days ago`, -CALENDAR_FEED_PAST_DAYS, true],
      [`${CALENDAR_FEED_PAST_DAYS + 1} days ago`, -(CALENDAR_FEED_PAST_DAYS + 1), false],
    ])("should keep a Moment from %s: %s", async (_label, days, included) => {
      const { result } = await runWith([
        makeMoment({ id: "m1", status: "PAST", startsAt: daysFromNow(days) }),
      ]);

      expect(result.map((m) => m.id)).toEqual(included ? ["m1"] : []);
    });
  });

  describe("given Moments returned in chronological order", () => {
    it("should keep that order", async () => {
      const { result } = await runWith([
        makeMoment({ id: "past", status: "PAST", startsAt: daysFromNow(-10) }),
        makeMoment({ id: "soon", startsAt: daysFromNow(3) }),
        makeMoment({ id: "later", startsAt: daysFromNow(30) }),
      ]);

      expect(result.map((m) => m.id)).toEqual(["past", "soon", "later"]);
    });
  });
});
