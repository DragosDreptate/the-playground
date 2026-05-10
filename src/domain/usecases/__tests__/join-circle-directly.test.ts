import { describe, it, expect, vi } from "vitest";
import { joinCircleDirectly } from "@/domain/usecases/join-circle-directly";
import {
  createMockCircleRepository,
  makeCircle,
  makeMembership,
} from "./helpers/mock-circle-repository";
import { CircleNotFoundError } from "@/domain/errors";

describe("joinCircleDirectly", () => {
  describe("given a non-existent circle", () => {
    it("should throw CircleNotFoundError", async () => {
      const circleRepo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(null),
        findMembership: vi.fn().mockResolvedValue(null),
      });

      await expect(
        joinCircleDirectly(
          { circleId: "missing-circle", userId: "user-1" },
          { circleRepository: circleRepo }
        )
      ).rejects.toThrow(CircleNotFoundError);
    });
  });

  describe("given the user is already an ACTIVE member", () => {
    it("should return alreadyMember=true without creating a new membership", async () => {
      const existing = makeMembership({ status: "ACTIVE", role: "PLAYER" });
      const addMembership = vi.fn();
      const circleRepo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(makeCircle()),
        findMembership: vi.fn().mockResolvedValue(existing),
        addMembership,
      });

      const result = await joinCircleDirectly(
        { circleId: "circle-1", userId: "user-1" },
        { circleRepository: circleRepo }
      );

      expect(result.alreadyMember).toBe(true);
      expect(result.pendingApproval).toBe(false);
      expect(result.membership).toBe(existing);
      expect(addMembership).not.toHaveBeenCalled();
    });
  });

  describe("given the user has a PENDING membership", () => {
    it("should return pendingApproval=true without creating a new membership", async () => {
      const existing = makeMembership({ status: "PENDING", role: "PLAYER" });
      const addMembership = vi.fn();
      const circleRepo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(makeCircle({ requiresApproval: true })),
        findMembership: vi.fn().mockResolvedValue(existing),
        addMembership,
      });

      const result = await joinCircleDirectly(
        { circleId: "circle-1", userId: "user-1" },
        { circleRepository: circleRepo }
      );

      expect(result.alreadyMember).toBe(false);
      expect(result.pendingApproval).toBe(true);
      expect(result.membership).toBe(existing);
      expect(addMembership).not.toHaveBeenCalled();
    });
  });

  describe("given a non-member joining a circle without approval requirement", () => {
    it("should create an ACTIVE PLAYER membership", async () => {
      const created = makeMembership({ status: "ACTIVE", role: "PLAYER" });
      const addMembership = vi.fn().mockResolvedValue(created);
      const circleRepo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(makeCircle({ requiresApproval: false })),
        findMembership: vi.fn().mockResolvedValue(null),
        addMembership,
      });

      const result = await joinCircleDirectly(
        { circleId: "circle-1", userId: "user-1" },
        { circleRepository: circleRepo }
      );

      expect(addMembership).toHaveBeenCalledWith("circle-1", "user-1", "PLAYER", "ACTIVE");
      expect(result.alreadyMember).toBe(false);
      expect(result.pendingApproval).toBe(false);
      expect(result.membership).toBe(created);
    });
  });

  describe("given a non-member joining a circle that requires approval", () => {
    it("should create a PENDING PLAYER membership", async () => {
      const created = makeMembership({ status: "PENDING", role: "PLAYER" });
      const addMembership = vi.fn().mockResolvedValue(created);
      const circleRepo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(makeCircle({ requiresApproval: true })),
        findMembership: vi.fn().mockResolvedValue(null),
        addMembership,
      });

      const result = await joinCircleDirectly(
        { circleId: "circle-1", userId: "user-1" },
        { circleRepository: circleRepo }
      );

      expect(addMembership).toHaveBeenCalledWith("circle-1", "user-1", "PLAYER", "PENDING");
      expect(result.alreadyMember).toBe(false);
      expect(result.pendingApproval).toBe(true);
      expect(result.membership).toBe(created);
    });
  });
});
