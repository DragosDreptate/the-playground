import { describe, it, expect, vi } from "vitest";
import { getAdminMoments } from "@/domain/usecases/admin/get-admin-moments";
import {
  createMockAdminRepository,
  makeAdminMomentRow,
} from "./mock-admin-repository";

describe("GetAdminMoments", () => {
  describe("given no filters", () => {
    it("should return moments and total count", async () => {
      const moments = [
        makeAdminMomentRow({ id: "moment-1" }),
        makeAdminMomentRow({ id: "moment-2" }),
      ];
      const adminRepository = createMockAdminRepository({
        findAllMoments: vi.fn().mockResolvedValue(moments),
        countMoments: vi.fn().mockResolvedValue(2),
      });

      const result = await getAdminMoments({}, { adminRepository });

      expect(result.moments).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe("given a search filter", () => {
    it("should pass the search filter to both findAllMoments and countMoments", async () => {
      const adminRepository = createMockAdminRepository({
        findAllMoments: vi.fn().mockResolvedValue([]),
        countMoments: vi.fn().mockResolvedValue(0),
      });

      await getAdminMoments({ search: "meetup" }, { adminRepository });

      expect(adminRepository.findAllMoments).toHaveBeenCalledWith({ search: "meetup" });
      expect(adminRepository.countMoments).toHaveBeenCalledWith({ search: "meetup" });
    });
  });

  describe("given a status filter", () => {
    it("should pass the status filter to the repository", async () => {
      const draftMoments = [makeAdminMomentRow({ status: "DRAFT" })];
      const adminRepository = createMockAdminRepository({
        findAllMoments: vi.fn().mockResolvedValue(draftMoments),
        countMoments: vi.fn().mockResolvedValue(1),
      });

      const result = await getAdminMoments({ status: "DRAFT" }, { adminRepository });

      expect(result.moments[0].status).toBe("DRAFT");
      expect(adminRepository.findAllMoments).toHaveBeenCalledWith({ status: "DRAFT" });
    });
  });

  describe("given pagination filters", () => {
    it("should pass limit and offset to both repository methods", async () => {
      const adminRepository = createMockAdminRepository({
        findAllMoments: vi.fn().mockResolvedValue([]),
        countMoments: vi.fn().mockResolvedValue(100),
      });

      await getAdminMoments({ limit: 20, offset: 40 }, { adminRepository });

      expect(adminRepository.findAllMoments).toHaveBeenCalledWith({ limit: 20, offset: 40 });
      expect(adminRepository.countMoments).toHaveBeenCalledWith({ limit: 20, offset: 40 });
    });
  });

  describe("given no matching moments", () => {
    it("should return an empty list with total 0", async () => {
      const adminRepository = createMockAdminRepository({
        findAllMoments: vi.fn().mockResolvedValue([]),
        countMoments: vi.fn().mockResolvedValue(0),
      });

      const result = await getAdminMoments({ search: "nothing" }, { adminRepository });

      expect(result.moments).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe("given the repository calls", () => {
    it("should call findAllMoments and countMoments", async () => {
      const adminRepository = createMockAdminRepository({
        findAllMoments: vi.fn().mockResolvedValue([]),
        countMoments: vi.fn().mockResolvedValue(0),
      });

      await getAdminMoments({}, { adminRepository });

      expect(adminRepository.findAllMoments).toHaveBeenCalledOnce();
      expect(adminRepository.countMoments).toHaveBeenCalledOnce();
    });
  });
});
