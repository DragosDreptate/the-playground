import { describe, it, expect, vi } from "vitest";
import { getMomentBySlug, getMomentById } from "@/domain/usecases/get-moment";
import { MomentNotFoundError } from "@/domain/errors";
import {
  createMockMomentRepository,
  makeMoment,
} from "./helpers/mock-moment-repository";

describe("GetMoment", () => {
  describe("getMomentBySlug", () => {
    describe("given an existing slug", () => {
      it("should return the Moment", async () => {
        const moment = makeMoment({ slug: "weekly-meetup" });
        const repo = createMockMomentRepository({
          findBySlug: vi.fn().mockResolvedValue(moment),
        });

        const result = await getMomentBySlug("weekly-meetup", {
          momentRepository: repo,
        });

        expect(result).toEqual(moment);
        expect(repo.findBySlug).toHaveBeenCalledWith("weekly-meetup");
      });
    });

    describe("given a non-existing slug", () => {
      it("should throw MomentNotFoundError", async () => {
        const repo = createMockMomentRepository();

        await expect(
          getMomentBySlug("unknown", { momentRepository: repo })
        ).rejects.toThrow(MomentNotFoundError);
      });
    });
  });

  describe("getMomentById", () => {
    describe("given an existing id", () => {
      it("should return the Moment", async () => {
        const moment = makeMoment({ id: "moment-123" });
        const repo = createMockMomentRepository({
          findById: vi.fn().mockResolvedValue(moment),
        });

        const result = await getMomentById("moment-123", {
          momentRepository: repo,
        });

        expect(result).toEqual(moment);
        expect(repo.findById).toHaveBeenCalledWith("moment-123");
      });
    });

    describe("given a non-existing id", () => {
      it("should throw MomentNotFoundError", async () => {
        const repo = createMockMomentRepository();

        await expect(
          getMomentById("unknown", { momentRepository: repo })
        ).rejects.toThrow(MomentNotFoundError);
      });
    });
  });
});
