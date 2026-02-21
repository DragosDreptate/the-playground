import { describe, it, expect, vi } from "vitest";
import { getAdminCircle } from "@/domain/usecases/admin/get-admin-circle";
import {
  createMockAdminRepository,
  makeAdminCircleDetail,
} from "./mock-admin-repository";

describe("GetAdminCircle", () => {
  describe("given an existing circle", () => {
    it("should return the circle detail", async () => {
      const circleDetail = makeAdminCircleDetail({
        id: "circle-1",
        name: "Tech Paris",
        slug: "tech-paris",
        visibility: "PUBLIC",
        category: "TECH",
      });
      const adminRepository = createMockAdminRepository({
        findCircleById: vi.fn().mockResolvedValue(circleDetail),
      });

      const result = await getAdminCircle("circle-1", { adminRepository });

      expect(result).toEqual(circleDetail);
      expect(adminRepository.findCircleById).toHaveBeenCalledWith("circle-1");
    });
  });

  describe("given a circle with multiple hosts", () => {
    it("should return all host details", async () => {
      const circleDetail = makeAdminCircleDetail({
        hosts: [
          { id: "user-1", email: "alice@example.com", firstName: "Alice", lastName: "Martin" },
          { id: "user-2", email: "bob@example.com", firstName: "Bob", lastName: "Dupont" },
        ],
      });
      const adminRepository = createMockAdminRepository({
        findCircleById: vi.fn().mockResolvedValue(circleDetail),
      });

      const result = await getAdminCircle("circle-1", { adminRepository });

      expect(result?.hosts).toHaveLength(2);
      expect(result?.hosts[0].email).toBe("alice@example.com");
      expect(result?.hosts[1].email).toBe("bob@example.com");
    });
  });

  describe("given a circle with recent moments", () => {
    it("should return the recent moments list", async () => {
      const circleDetail = makeAdminCircleDetail({
        recentMoments: [
          { id: "m-1", title: "Meetup A", slug: "meetup-a", status: "PUBLISHED", startsAt: new Date("2026-03-01") },
          { id: "m-2", title: "Meetup B", slug: "meetup-b", status: "PAST", startsAt: new Date("2026-01-01") },
        ],
      });
      const adminRepository = createMockAdminRepository({
        findCircleById: vi.fn().mockResolvedValue(circleDetail),
      });

      const result = await getAdminCircle("circle-1", { adminRepository });

      expect(result?.recentMoments).toHaveLength(2);
      expect(result?.recentMoments[0].status).toBe("PUBLISHED");
    });
  });

  describe("given a non-existent circle", () => {
    it("should return null", async () => {
      const adminRepository = createMockAdminRepository({
        findCircleById: vi.fn().mockResolvedValue(null),
      });

      const result = await getAdminCircle("circle-999", { adminRepository });

      expect(result).toBeNull();
    });
  });
});
