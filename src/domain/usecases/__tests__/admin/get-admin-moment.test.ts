import { describe, it, expect, vi } from "vitest";
import { getAdminMoment } from "@/domain/usecases/admin/get-admin-moment";
import {
  createMockAdminRepository,
  makeAdminMomentDetail,
} from "./mock-admin-repository";

describe("GetAdminMoment", () => {
  describe("given an existing moment", () => {
    it("should return the moment detail", async () => {
      const momentDetail = makeAdminMomentDetail({
        id: "moment-1",
        title: "Meetup React",
        status: "PUBLISHED",
      });
      const adminRepository = createMockAdminRepository({
        findMomentById: vi.fn().mockResolvedValue(momentDetail),
      });

      const result = await getAdminMoment("moment-1", { adminRepository });

      expect(result).toEqual(momentDetail);
      expect(adminRepository.findMomentById).toHaveBeenCalledWith("moment-1");
    });
  });

  describe("given a moment with registrations", () => {
    it("should return all registrations in the detail", async () => {
      const momentDetail = makeAdminMomentDetail({
        registrations: [
          {
            id: "reg-1",
            userId: "user-2",
            userEmail: "bob@example.com",
            userName: "Bob Dupont",
            status: "REGISTERED",
            registeredAt: new Date("2026-02-01"),
          },
          {
            id: "reg-2",
            userId: "user-3",
            userEmail: "claire@example.com",
            userName: "Claire Leroy",
            status: "WAITLISTED",
            registeredAt: new Date("2026-02-02"),
          },
        ],
      });
      const adminRepository = createMockAdminRepository({
        findMomentById: vi.fn().mockResolvedValue(momentDetail),
      });

      const result = await getAdminMoment("moment-1", { adminRepository });

      expect(result?.registrations).toHaveLength(2);
      expect(result?.registrations[0].status).toBe("REGISTERED");
      expect(result?.registrations[1].status).toBe("WAITLISTED");
    });
  });

  describe("given a moment with circle information", () => {
    it("should return circle details", async () => {
      const momentDetail = makeAdminMomentDetail({
        circleId: "circle-1",
        circleSlug: "tech-paris",
        circleName: "Tech Paris",
      });
      const adminRepository = createMockAdminRepository({
        findMomentById: vi.fn().mockResolvedValue(momentDetail),
      });

      const result = await getAdminMoment("moment-1", { adminRepository });

      expect(result?.circleId).toBe("circle-1");
      expect(result?.circleSlug).toBe("tech-paris");
      expect(result?.circleName).toBe("Tech Paris");
    });
  });

  describe("given a non-existent moment", () => {
    it("should return null", async () => {
      const adminRepository = createMockAdminRepository({
        findMomentById: vi.fn().mockResolvedValue(null),
      });

      const result = await getAdminMoment("moment-999", { adminRepository });

      expect(result).toBeNull();
    });
  });
});
