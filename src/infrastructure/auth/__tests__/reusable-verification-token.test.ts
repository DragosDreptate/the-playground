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

    it("should still return null when delete races with another cleanup (Prisma P2025)", async () => {
      prisma.verificationToken.findUnique.mockResolvedValue({
        identifier: ARGS.identifier,
        token: ARGS.token,
        expires: new Date(Date.now() - 1),
      });
      // Reproduit la shape réelle d'une PrismaClientKnownRequestError P2025 :
      // l'objet a un `.code === "P2025"` que `isPrismaRecordNotFound` détecte.
      const p2025 = Object.assign(new Error("Record not found"), { code: "P2025" });
      prisma.verificationToken.delete.mockRejectedValue(p2025);

      const result = await useVerificationToken(ARGS);

      expect(result).toBeNull();
    });

    it("should rethrow non-P2025 errors so observability is preserved", async () => {
      prisma.verificationToken.findUnique.mockResolvedValue({
        identifier: ARGS.identifier,
        token: ARGS.token,
        expires: new Date(Date.now() - 1),
      });
      const dbOutage = Object.assign(new Error("Connection terminated"), {
        code: "P1017",
      });
      prisma.verificationToken.delete.mockRejectedValue(dbOutage);

      await expect(useVerificationToken(ARGS)).rejects.toBe(dbOutage);
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
