/**
 * Tests de sécurité — Invitation de membres dans une Communauté
 *
 * Vérifie que :
 *   - Seul le HOST peut générer ou révoquer un lien d'invitation
 *   - Un PLAYER ou non-membre ne peut pas effectuer ces actions
 *   - L'isolation cross-tenant est garantie : un HOST de Circle B
 *     ne peut pas révoquer le lien du Circle A
 *   - joinCircleByInvite est sécurisé contre les tokens invalides/vides
 *   - joinCircleByInvite avec un token global (non scopé tenant) fonctionne
 *     pour tout utilisateur authentifié — comportement voulu
 */

import { describe, it, expect, vi } from "vitest";

import { generateCircleInviteToken } from "@/domain/usecases/generate-circle-invite-token";
import { revokeCircleInviteToken } from "@/domain/usecases/revoke-circle-invite-token";
import { joinCircleByInvite } from "@/domain/usecases/join-circle-by-invite";

import {
  UnauthorizedCircleActionError,
  CircleNotFoundError,
  InvalidInviteTokenError,
} from "@/domain/errors/circle-errors";

import {
  createMockCircleRepository,
  makeCircle,
  makeMembership,
} from "../helpers/mock-circle-repository";

// ─────────────────────────────────────────────────────────────
// generateCircleInviteToken — contrôle de rôle (RBAC)
// ─────────────────────────────────────────────────────────────

describe("Security — generateCircleInviteToken — contrôle de rôle (RBAC)", () => {
  describe("given a PLAYER attempts to generate an invite link for their Circle", () => {
    it("should throw UnauthorizedCircleActionError", async () => {
      const circle = makeCircle({ id: "circle-1" });
      const playerMembership = makeMembership({
        circleId: "circle-1",
        userId: "user-player",
        role: "PLAYER",
      });

      const repo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(circle),
        findMembership: vi.fn().mockResolvedValue(playerMembership),
        update: vi.fn(),
      });

      await expect(
        generateCircleInviteToken(
          { circleId: "circle-1", userId: "user-player" },
          { circleRepository: repo }
        )
      ).rejects.toThrow(UnauthorizedCircleActionError);

      // Aucun token ne doit être généré
      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe("given a non-member attempts to generate an invite link", () => {
    it("should throw UnauthorizedCircleActionError", async () => {
      const circle = makeCircle({ id: "circle-1" });

      const repo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(circle),
        findMembership: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      });

      await expect(
        generateCircleInviteToken(
          { circleId: "circle-1", userId: "stranger-user" },
          { circleRepository: repo }
        )
      ).rejects.toThrow(UnauthorizedCircleActionError);

      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe("given a HOST of Circle A attempts to generate an invite for Circle A", () => {
    it("should succeed and return a token", async () => {
      const token = crypto.randomUUID();
      const circle = makeCircle({ id: "circle-a", inviteToken: null });
      const hostMembership = makeMembership({
        circleId: "circle-a",
        userId: "host-a",
        role: "HOST",
      });
      const updatedCircle = makeCircle({ id: "circle-a", inviteToken: token });

      const repo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(circle),
        findMembership: vi.fn().mockResolvedValue(hostMembership),
        update: vi.fn().mockResolvedValue(updatedCircle),
      });

      const result = await generateCircleInviteToken(
        { circleId: "circle-a", userId: "host-a" },
        { circleRepository: repo }
      );

      expect(result.token).toBeTruthy();
    });
  });
});

// ─────────────────────────────────────────────────────────────
// revokeCircleInviteToken — contrôle de rôle (RBAC)
// ─────────────────────────────────────────────────────────────

describe("Security — revokeCircleInviteToken — contrôle de rôle (RBAC)", () => {
  describe("given a PLAYER attempts to revoke an invite link", () => {
    it("should throw UnauthorizedCircleActionError", async () => {
      const circle = makeCircle({ id: "circle-1", inviteToken: "active-token" });
      const playerMembership = makeMembership({
        circleId: "circle-1",
        userId: "user-player",
        role: "PLAYER",
      });

      const repo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(circle),
        findMembership: vi.fn().mockResolvedValue(playerMembership),
        update: vi.fn(),
      });

      await expect(
        revokeCircleInviteToken(
          { circleId: "circle-1", userId: "user-player" },
          { circleRepository: repo }
        )
      ).rejects.toThrow(UnauthorizedCircleActionError);

      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe("given a non-member attempts to revoke an invite link", () => {
    it("should throw UnauthorizedCircleActionError", async () => {
      const circle = makeCircle({ id: "circle-1", inviteToken: "active-token" });

      const repo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(circle),
        findMembership: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      });

      await expect(
        revokeCircleInviteToken(
          { circleId: "circle-1", userId: "intruder-user" },
          { circleRepository: repo }
        )
      ).rejects.toThrow(UnauthorizedCircleActionError);

      expect(repo.update).not.toHaveBeenCalled();
    });
  });
});

// ─────────────────────────────────────────────────────────────
// revokeCircleInviteToken — isolation cross-tenant (IDOR)
//
// Scénario : user-attacker est HOST de circle-b mais tente
// de révoquer le lien d'invitation de circle-a.
// findMembership("circle-a", "user-attacker") → null
// ─────────────────────────────────────────────────────────────

describe("Security — revokeCircleInviteToken — isolation cross-tenant (IDOR)", () => {
  describe("given a HOST of Circle B attempts to revoke the invite link of Circle A", () => {
    it("should throw UnauthorizedCircleActionError and not update Circle A", async () => {
      const circleA = makeCircle({ id: "circle-a", inviteToken: "circle-a-token" });

      const repo = createMockCircleRepository({
        findById: vi.fn().mockImplementation((id: string) => {
          if (id === "circle-a") return Promise.resolve(circleA);
          return Promise.resolve(null);
        }),
        // L'attaquant est HOST de circle-b mais pas membre de circle-a
        findMembership: vi.fn().mockImplementation((circleId: string) => {
          if (circleId === "circle-b") {
            return Promise.resolve(
              makeMembership({ userId: "host-of-b", circleId: "circle-b", role: "HOST" })
            );
          }
          return Promise.resolve(null); // pas membre de circle-a
        }),
        update: vi.fn(),
      });

      await expect(
        revokeCircleInviteToken(
          { circleId: "circle-a", userId: "host-of-b" },
          { circleRepository: repo }
        )
      ).rejects.toThrow(UnauthorizedCircleActionError);

      // Vérifier que le check a bien été fait sur circle-a (le Circle ciblé)
      expect(repo.findMembership).toHaveBeenCalledWith("circle-a", "host-of-b");
      // Le lien de circle-a ne doit pas être modifié
      expect(repo.update).not.toHaveBeenCalled();
    });
  });
});

// ─────────────────────────────────────────────────────────────
// generateCircleInviteToken — isolation cross-tenant (IDOR)
// ─────────────────────────────────────────────────────────────

describe("Security — generateCircleInviteToken — isolation cross-tenant (IDOR)", () => {
  describe("given a HOST of Circle B attempts to generate a token for Circle A", () => {
    it("should throw UnauthorizedCircleActionError and not create a token for Circle A", async () => {
      const circleA = makeCircle({ id: "circle-a", inviteToken: null });

      const repo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(circleA),
        // L'attaquant n'est pas membre de circle-a
        findMembership: vi.fn().mockImplementation((circleId: string) => {
          if (circleId === "circle-b") {
            return Promise.resolve(
              makeMembership({ userId: "host-of-b", circleId: "circle-b", role: "HOST" })
            );
          }
          return Promise.resolve(null);
        }),
        update: vi.fn(),
      });

      await expect(
        generateCircleInviteToken(
          { circleId: "circle-a", userId: "host-of-b" },
          { circleRepository: repo }
        )
      ).rejects.toThrow(UnauthorizedCircleActionError);

      expect(repo.findMembership).toHaveBeenCalledWith("circle-a", "host-of-b");
      expect(repo.update).not.toHaveBeenCalled();
    });
  });
});

// ─────────────────────────────────────────────────────────────
// joinCircleByInvite — protection contre les tokens vides/nuls
// ─────────────────────────────────────────────────────────────

describe("Security — joinCircleByInvite — protection contre les tokens invalides", () => {
  describe("given an empty token string", () => {
    it("should throw InvalidInviteTokenError when token is an empty string", async () => {
      // findByInviteToken("") ne trouve aucun Circle (comportement DB attendu)
      const repo = createMockCircleRepository({
        findByInviteToken: vi.fn().mockResolvedValue(null),
        addMembership: vi.fn(),
      });

      await expect(
        joinCircleByInvite(
          { token: "", userId: "user-1" },
          { circleRepository: repo }
        )
      ).rejects.toThrow(InvalidInviteTokenError);

      expect(repo.addMembership).not.toHaveBeenCalled();
    });
  });

  describe("given a random non-existent token", () => {
    it("should throw InvalidInviteTokenError", async () => {
      const repo = createMockCircleRepository({
        findByInviteToken: vi.fn().mockResolvedValue(null),
        addMembership: vi.fn(),
      });

      await expect(
        joinCircleByInvite(
          { token: "nonexistent-or-revoked-token", userId: "user-1" },
          { circleRepository: repo }
        )
      ).rejects.toThrow(InvalidInviteTokenError);

      expect(repo.addMembership).not.toHaveBeenCalled();
    });
  });
});

// ─────────────────────────────────────────────────────────────
// joinCircleByInvite — token global (non scopé tenant)
//
// Le token d'invitation est global (pas scopé à un Circle ou tenant).
// Tout utilisateur authentifié possédant un token valide peut l'utiliser.
// C'est un comportement intentionnel : l'Organisateur génère le lien
// et le partage à qui il veut.
//
// Scénario : user-from-tenant-b utilise le token d'un Circle de tenant-a.
// Ce doit être autorisé (le token est la preuve d'invitation).
// ─────────────────────────────────────────────────────────────

describe("Security — joinCircleByInvite — token global (comportement voulu)", () => {
  describe("given a user from a different context uses a valid token", () => {
    it("should succeed and add PLAYER membership (token is intentionally global)", async () => {
      const token = "shared-invite-token";
      const circleA = makeCircle({ id: "circle-a", inviteToken: token, name: "Circle A" });
      // L'utilisateur n'est pas encore membre
      const newMembership = makeMembership({
        circleId: "circle-a",
        userId: "user-from-anywhere",
        role: "PLAYER",
      });

      const repo = createMockCircleRepository({
        findByInviteToken: vi.fn().mockResolvedValue(circleA),
        findMembership: vi.fn().mockResolvedValue(null),
        addMembership: vi.fn().mockResolvedValue(newMembership),
      });

      const result = await joinCircleByInvite(
        { token, userId: "user-from-anywhere" },
        { circleRepository: repo }
      );

      expect(result.alreadyMember).toBe(false);
      expect(result.circle.id).toBe("circle-a");
      expect(repo.addMembership).toHaveBeenCalledWith("circle-a", "user-from-anywhere", "PLAYER");
    });
  });

  describe("given a user accesses a Circle via a token they already used (idempotent re-entry)", () => {
    it("should return alreadyMember=true without creating a duplicate membership", async () => {
      const token = "already-used-token";
      const circle = makeCircle({ id: "circle-a", inviteToken: token });
      const existingMembership = makeMembership({
        circleId: "circle-a",
        userId: "returning-user",
        role: "PLAYER",
      });

      const repo = createMockCircleRepository({
        findByInviteToken: vi.fn().mockResolvedValue(circle),
        findMembership: vi.fn().mockResolvedValue(existingMembership),
        addMembership: vi.fn(),
      });

      const result = await joinCircleByInvite(
        { token, userId: "returning-user" },
        { circleRepository: repo }
      );

      expect(result.alreadyMember).toBe(true);
      expect(repo.addMembership).not.toHaveBeenCalled();
    });
  });
});

// ─────────────────────────────────────────────────────────────
// Vérification que les erreurs throwées contiennent le bon code
// (permet de distinguer les erreurs côté API)
// ─────────────────────────────────────────────────────────────

describe("Security — codes d'erreur corrects pour les erreurs d'invitation", () => {
  it("should throw an error with code UNAUTHORIZED_CIRCLE_ACTION when PLAYER tries to generate token", async () => {
    const repo = createMockCircleRepository({
      findById: vi.fn().mockResolvedValue(makeCircle()),
      findMembership: vi.fn().mockResolvedValue(
        makeMembership({ role: "PLAYER" })
      ),
    });

    try {
      await generateCircleInviteToken(
        { circleId: "circle-1", userId: "player-1" },
        { circleRepository: repo }
      );
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(UnauthorizedCircleActionError);
      expect((err as UnauthorizedCircleActionError).code).toBe("UNAUTHORIZED_CIRCLE_ACTION");
    }
  });

  it("should throw an error with code INVALID_INVITE_TOKEN when token is not found", async () => {
    const repo = createMockCircleRepository({
      findByInviteToken: vi.fn().mockResolvedValue(null),
    });

    try {
      await joinCircleByInvite(
        { token: "bad-token", userId: "user-1" },
        { circleRepository: repo }
      );
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidInviteTokenError);
      expect((err as InvalidInviteTokenError).code).toBe("INVALID_INVITE_TOKEN");
    }
  });

  it("should throw an error with code CIRCLE_NOT_FOUND when circle does not exist", async () => {
    const repo = createMockCircleRepository({
      findById: vi.fn().mockResolvedValue(null),
    });

    try {
      await revokeCircleInviteToken(
        { circleId: "nonexistent-circle", userId: "user-1" },
        { circleRepository: repo }
      );
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(CircleNotFoundError);
      expect((err as CircleNotFoundError).code).toBe("CIRCLE_NOT_FOUND");
    }
  });
});
