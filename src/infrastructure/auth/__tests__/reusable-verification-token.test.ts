import { describe, it, expect, vi, beforeEach } from "vitest";
import { createReusableVerificationToken } from "../reusable-verification-token";

type MockedPrisma = {
  verificationToken: {
    findUnique: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
};

function makePrisma(): MockedPrisma {
  return {
    verificationToken: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  };
}

const ARGS = { identifier: "user@example.com", token: "hashed-token-abc" };

describe("createReusableVerificationToken", () => {
  let prisma: MockedPrisma;
  let useVerificationToken: ReturnType<typeof createReusableVerificationToken>;

  beforeEach(() => {
    prisma = makePrisma();
    useVerificationToken = createReusableVerificationToken(
      prisma as unknown as Parameters<typeof createReusableVerificationToken>[0],
    );
  });

  describe("given the token is not found", () => {
    it("should return null without deleting", async () => {
      prisma.verificationToken.findUnique.mockResolvedValue(null);

      const result = await useVerificationToken(ARGS);

      expect(result).toBeNull();
      expect(prisma.verificationToken.delete).not.toHaveBeenCalled();
    });
  });

  describe("given the token is expired", () => {
    it("should delete the row and return null", async () => {
      const expired = {
        identifier: ARGS.identifier,
        token: ARGS.token,
        expires: new Date(Date.now() - 60_000),
      };
      prisma.verificationToken.findUnique.mockResolvedValue(expired);
      prisma.verificationToken.delete.mockResolvedValue(expired);

      const result = await useVerificationToken(ARGS);

      expect(result).toBeNull();
      expect(prisma.verificationToken.delete).toHaveBeenCalledWith({
        where: { identifier_token: ARGS },
      });
    });

    it("should still return null when the delete itself fails (concurrent cleanup)", async () => {
      prisma.verificationToken.findUnique.mockResolvedValue({
        identifier: ARGS.identifier,
        token: ARGS.token,
        expires: new Date(Date.now() - 1),
      });
      prisma.verificationToken.delete.mockRejectedValue(new Error("P2025"));

      const result = await useVerificationToken(ARGS);

      expect(result).toBeNull();
    });
  });

  describe("given the token is valid and not expired", () => {
    const valid = {
      identifier: ARGS.identifier,
      token: ARGS.token,
      expires: new Date(Date.now() + 10 * 60 * 1000),
    };

    it("should return the token without deleting it", async () => {
      prisma.verificationToken.findUnique.mockResolvedValue(valid);

      const result = await useVerificationToken(ARGS);

      expect(result).toEqual(valid);
      expect(prisma.verificationToken.delete).not.toHaveBeenCalled();
    });

    it("should be reusable: returns the same valid token on consecutive calls", async () => {
      prisma.verificationToken.findUnique.mockResolvedValue(valid);

      const first = await useVerificationToken(ARGS);
      const second = await useVerificationToken(ARGS);
      const third = await useVerificationToken(ARGS);

      expect(first).toEqual(valid);
      expect(second).toEqual(valid);
      expect(third).toEqual(valid);
      expect(prisma.verificationToken.delete).not.toHaveBeenCalled();
    });
  });
});
