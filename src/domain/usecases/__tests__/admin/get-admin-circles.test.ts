import { describe, it, expect, vi } from "vitest";
import { getAdminCircles } from "@/domain/usecases/admin/get-admin-circles";
import {
  createMockAdminRepository,
  makeAdminCircleRow,
} from "./mock-admin-repository";

describe("GetAdminCircles", () => {
  describe("given no filters", () => {
    it("should return circles and total count", async () => {
      const circles = [
        makeAdminCircleRow({ id: "circle-1" }),
        makeAdminCircleRow({ id: "circle-2" }),
      ];
      const adminRepository = createMockAdminRepository({
        findAllCircles: vi.fn().mockResolvedValue(circles),
        countCircles: vi.fn().mockResolvedValue(2),
      });

      const result = await getAdminCircles("ADMIN", {}, { adminRepository });

      expect(result.circles).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe("given a search filter", () => {
    it("should pass the search filter to both findAllCircles and countCircles", async () => {
      const adminRepository = createMockAdminRepository({
        findAllCircles: vi.fn().mockResolvedValue([]),
        countCircles: vi.fn().mockResolvedValue(0),
      });

      await getAdminCircles("ADMIN", { search: "tech" }, { adminRepository });

      expect(adminRepository.findAllCircles).toHaveBeenCalledWith({ search: "tech" });
      expect(adminRepository.countCircles).toHaveBeenCalledWith({ search: "tech" });
    });
  });

  describe("given a visibility filter", () => {
    it("should pass the visibility filter to the repository", async () => {
      const circles = [makeAdminCircleRow({ visibility: "PRIVATE" })];
      const adminRepository = createMockAdminRepository({
        findAllCircles: vi.fn().mockResolvedValue(circles),
        countCircles: vi.fn().mockResolvedValue(1),
      });

      const result = await getAdminCircles("ADMIN", { visibility: "PRIVATE" }, { adminRepository });

      expect(result.circles[0].visibility).toBe("PRIVATE");
      expect(adminRepository.findAllCircles).toHaveBeenCalledWith({ visibility: "PRIVATE" });
    });
  });

  describe("given a category filter", () => {
    it("should pass the category filter to the repository", async () => {
      const adminRepository = createMockAdminRepository({
        findAllCircles: vi.fn().mockResolvedValue([]),
        countCircles: vi.fn().mockResolvedValue(0),
      });

      await getAdminCircles("ADMIN", { category: "SPORT_WELLNESS" }, { adminRepository });

      expect(adminRepository.findAllCircles).toHaveBeenCalledWith({ category: "SPORT_WELLNESS" });
      expect(adminRepository.countCircles).toHaveBeenCalledWith({ category: "SPORT_WELLNESS" });
    });
  });

  describe("given pagination filters", () => {
    it("should pass limit and offset to both repository methods", async () => {
      const adminRepository = createMockAdminRepository({
        findAllCircles: vi.fn().mockResolvedValue([]),
        countCircles: vi.fn().mockResolvedValue(50),
      });

      await getAdminCircles("ADMIN", { limit: 10, offset: 20 }, { adminRepository });

      expect(adminRepository.findAllCircles).toHaveBeenCalledWith({ limit: 10, offset: 20 });
      expect(adminRepository.countCircles).toHaveBeenCalledWith({ limit: 10, offset: 20 });
    });
  });

  describe("given no matching circles", () => {
    it("should return an empty list with total 0", async () => {
      const adminRepository = createMockAdminRepository({
        findAllCircles: vi.fn().mockResolvedValue([]),
        countCircles: vi.fn().mockResolvedValue(0),
      });

      const result = await getAdminCircles("ADMIN", { search: "nothing" }, { adminRepository });

      expect(result.circles).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
