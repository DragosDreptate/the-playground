import { describe, it, expect } from "vitest";
import { updateNotificationPreferences } from "../update-notification-preferences";
import {
  createMockUserRepository,
  makeUser,
  makeNotificationPreferences,
} from "./helpers/mock-user-repository";
import { UserNotFoundError } from "@/domain/errors";

describe("updateNotificationPreferences", () => {
  describe("given the user does not exist", () => {
    it("should throw UserNotFoundError", async () => {
      const userRepository = createMockUserRepository({
        findById: async () => null,
      });

      await expect(
        updateNotificationPreferences(
          {
            userId: "unknown-user",
            notifyNewRegistration: false,
            notifyNewComment: false,
            notifyNewFollower: false,
            notifyNewMomentInCircle: false,
          },
          { userRepository }
        )
      ).rejects.toThrow(UserNotFoundError);
    });
  });

  describe("given the user exists", () => {
    it("should update notification preferences and return them", async () => {
      const user = makeUser({ id: "user-1" });
      const updatedPrefs = makeNotificationPreferences({
        notifyNewRegistration: false,
        notifyNewComment: true,
        notifyNewFollower: false,
        notifyNewMomentInCircle: true,
      });

      const userRepository = createMockUserRepository({
        findById: async () => user,
        updateNotificationPreferences: async () => updatedPrefs,
      });

      const result = await updateNotificationPreferences(
        {
          userId: "user-1",
          notifyNewRegistration: false,
          notifyNewComment: true,
          notifyNewFollower: false,
          notifyNewMomentInCircle: true,
        },
        { userRepository }
      );

      expect(result).toEqual(updatedPrefs);
    });

    it("should pass the correct preferences to the repository", async () => {
      const user = makeUser({ id: "user-1" });
      let captured: Parameters<typeof userRepository.updateNotificationPreferences>[1] | undefined;

      const userRepository = createMockUserRepository({
        findById: async () => user,
        updateNotificationPreferences: async (_id, input) => {
          captured = input;
          return input;
        },
      });

      await updateNotificationPreferences(
        {
          userId: "user-1",
          notifyNewRegistration: true,
          notifyNewComment: false,
          notifyNewFollower: true,
          notifyNewMomentInCircle: false,
        },
        { userRepository }
      );

      expect(captured).toEqual({
        notifyNewRegistration: true,
        notifyNewComment: false,
        notifyNewFollower: true,
        notifyNewMomentInCircle: false,
      });
    });
  });

  describe("given all preferences are toggled off", () => {
    it("should persist all-false state", async () => {
      const user = makeUser({ id: "user-1" });
      const allOff = makeNotificationPreferences({
        notifyNewRegistration: false,
        notifyNewComment: false,
        notifyNewFollower: false,
        notifyNewMomentInCircle: false,
      });

      const userRepository = createMockUserRepository({
        findById: async () => user,
        updateNotificationPreferences: async () => allOff,
      });

      const result = await updateNotificationPreferences(
        { userId: "user-1", ...allOff },
        { userRepository }
      );

      expect(result.notifyNewRegistration).toBe(false);
      expect(result.notifyNewComment).toBe(false);
      expect(result.notifyNewFollower).toBe(false);
      expect(result.notifyNewMomentInCircle).toBe(false);
    });
  });
});
