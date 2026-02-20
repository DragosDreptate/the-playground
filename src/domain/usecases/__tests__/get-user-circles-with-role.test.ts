import { describe, it, expect } from "vitest";
import { getUserCirclesWithRole } from "@/domain/usecases/get-user-circles-with-role";
import {
  createMockCircleRepository,
  makeCircle,
} from "./helpers/mock-circle-repository";
import type { CircleWithRole } from "@/domain/models/circle";

describe("GetUserCirclesWithRole", () => {
  describe("given the user belongs to circles as HOST and PLAYER", () => {
    it("should return all circles with their respective roles", async () => {
      const circlesWithRoles: CircleWithRole[] = [
        { ...makeCircle({ id: "circle-1", name: "My Community" }), memberRole: "HOST" },
        { ...makeCircle({ id: "circle-2", name: "Another Community" }), memberRole: "PLAYER" },
      ];
      const circleRepository = createMockCircleRepository({
        findAllByUserId: async () => circlesWithRoles,
      });

      const result = await getUserCirclesWithRole("user-1", { circleRepository });

      expect(result).toHaveLength(2);
      expect(result[0].memberRole).toBe("HOST");
      expect(result[0].name).toBe("My Community");
      expect(result[1].memberRole).toBe("PLAYER");
      expect(result[1].name).toBe("Another Community");
    });
  });

  describe("given the user belongs to no circles", () => {
    it("should return an empty array", async () => {
      const circleRepository = createMockCircleRepository();

      const result = await getUserCirclesWithRole("user-1", { circleRepository });

      expect(result).toEqual([]);
    });
  });
});
