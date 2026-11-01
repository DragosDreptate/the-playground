import { describe, it, expect } from "vitest";
import {
  rememberPreferredLocaleIfMissing,
  setPreferredLocale,
} from "../set-preferred-locale";
import { createMockUserRepository } from "./helpers/mock-user-repository";

describe("setPreferredLocale", () => {
  describe("given a User who switches the interface to English", () => {
    it("should store English as the language of their emails", async () => {
      const userRepository = createMockUserRepository();

      await setPreferredLocale("user-1", "en", { userRepository });

      expect(userRepository.updatePreferredLocale).toHaveBeenCalledWith("user-1", "en");
    });
  });
});

describe("rememberPreferredLocaleIfMissing", () => {
  describe("given a User whose language is not known yet", () => {
    it("should only store the language when none is set (never overwrite a choice)", async () => {
      const userRepository = createMockUserRepository();

      await rememberPreferredLocaleIfMissing("user-1", "en", { userRepository });

      expect(userRepository.setPreferredLocaleIfMissing).toHaveBeenCalledWith("user-1", "en");
      expect(userRepository.updatePreferredLocale).not.toHaveBeenCalled();
    });
  });
});
