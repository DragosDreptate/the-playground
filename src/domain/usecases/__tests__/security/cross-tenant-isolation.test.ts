/**
 * Tests de sécurité — Isolation Cross-Tenant (IDOR)
 *
 * Vérifie qu'un utilisateur légitime dans un Circle ne peut pas
 * agir sur les ressources d'un autre Circle (Insecure Direct Object Reference).
 *
 * Scénario type :
 *   - user-attacker est HOST du Circle B (circleId: "circle-b")
 *   - La ressource cible appartient au Circle A (circleId: "circle-a")
 *   - findMembership("circle-a", "user-attacker") → null (pas membre de circle-a)
 *   - Le usecase doit rejeter avec l'erreur d'autorisation appropriée
 */

import { describe, it, expect, vi } from "vitest";

// Usecases
import { updateCircle } from "@/domain/usecases/update-circle";
import { deleteCircle } from "@/domain/usecases/delete-circle";
import { createMoment } from "@/domain/usecases/create-moment";
import { updateMoment } from "@/domain/usecases/update-moment";
import { deleteMoment } from "@/domain/usecases/delete-moment";
import { getMomentRegistrations } from "@/domain/usecases/get-moment-registrations";
import { cancelRegistration } from "@/domain/usecases/cancel-registration";
import { deleteComment } from "@/domain/usecases/delete-comment";

// Erreurs domaine
import {
  UnauthorizedCircleActionError,
  UnauthorizedMomentActionError,
  UnauthorizedRegistrationActionError,
  UnauthorizedCommentDeletionError,
} from "@/domain/errors";

// Helpers mock
import {
  createMockCircleRepository,
  makeCircle,
  makeMembership,
} from "../helpers/mock-circle-repository";
import {
  createMockMomentRepository,
  makeMoment,
} from "../helpers/mock-moment-repository";
import {
  createMockRegistrationRepository,
  makeRegistration,
} from "../helpers/mock-registration-repository";
import {
  createMockCommentRepository,
  makeComment,
} from "../helpers/mock-comment-repository";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Simule un attaquant qui est HOST de circle-b mais tente d'agir sur circle-a.
 * findMembership("circle-a", "user-attacker") → null
 * (l'attaquant est HOST d'un autre Circle mais pas de celui ciblé)
 */
function makeIdorCircleRepo(targetCircleId = "circle-a") {
  return createMockCircleRepository({
    findById: vi.fn().mockImplementation((id: string) => {
      if (id === targetCircleId) return Promise.resolve(makeCircle({ id: targetCircleId }));
      return Promise.resolve(null);
    }),
    // L'attaquant n'est pas membre du Circle cible
    findMembership: vi.fn().mockResolvedValue(null),
  });
}

// ─────────────────────────────────────────────────────────────
// IDOR — Circle
// ─────────────────────────────────────────────────────────────

describe("Security — Cross-Tenant Isolation (IDOR)", () => {
  describe("updateCircle — IDOR : HOST d'un autre Circle tente de modifier", () => {
    it("should throw UnauthorizedCircleActionError when a HOST of Circle B tries to update Circle A", async () => {
      // user-attacker est HOST de circle-b (non pertinent ici)
      // findMembership("circle-a", "user-attacker") → null
      const circleRepo = makeIdorCircleRepo("circle-a");

      await expect(
        updateCircle(
          { circleId: "circle-a", userId: "user-attacker", name: "Hijacked" },
          { circleRepository: circleRepo }
        )
      ).rejects.toThrow(UnauthorizedCircleActionError);

      // Vérifier que la vérification d'appartenance a bien été faite sur circle-a
      expect(circleRepo.findMembership).toHaveBeenCalledWith("circle-a", "user-attacker");
    });

    it("should NOT update Circle A even if attacker's own Circle ID is provided in the membership check", async () => {
      // Cas plus subtil : attaquant envoie son propre circleId dans l'input
      // mais le usecase doit vérifier l'appartenance sur l'ID du Circle cible
      const circleRepo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(makeCircle({ id: "circle-a" })),
        // Retourne HOST uniquement pour circle-b, pas circle-a
        findMembership: vi.fn().mockImplementation((circleId: string) => {
          if (circleId === "circle-b") {
            return Promise.resolve(makeMembership({ userId: "user-attacker", circleId: "circle-b", role: "HOST" }));
          }
          return Promise.resolve(null);
        }),
      });

      await expect(
        updateCircle(
          { circleId: "circle-a", userId: "user-attacker", name: "Hijacked" },
          { circleRepository: circleRepo }
        )
      ).rejects.toThrow(UnauthorizedCircleActionError);
    });
  });

  describe("deleteCircle — IDOR : HOST d'un autre Circle tente de supprimer", () => {
    it("should throw UnauthorizedCircleActionError when a HOST of Circle B tries to delete Circle A", async () => {
      const circleRepo = makeIdorCircleRepo("circle-a");

      await expect(
        deleteCircle(
          { circleId: "circle-a", userId: "user-attacker" },
          { circleRepository: circleRepo }
        )
      ).rejects.toThrow(UnauthorizedCircleActionError);

      expect(circleRepo.delete).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // IDOR — Moment (via circleId du Moment)
  // ─────────────────────────────────────────────────────────────

  describe("createMoment — IDOR : HOST d'un autre Circle tente de créer un Moment", () => {
    it("should throw UnauthorizedMomentActionError when a HOST of Circle B tries to create a Moment in Circle A", async () => {
      const circleRepo = createMockCircleRepository({
        // L'attaquant n'est pas membre de circle-a
        findMembership: vi.fn().mockResolvedValue(null),
      });
      const momentRepo = createMockMomentRepository();
      const registrationRepo = createMockRegistrationRepository();

      await expect(
        createMoment(
          {
            circleId: "circle-a",
            userId: "user-attacker",
            title: "Hijacked Moment",
            description: "Injected",
            startsAt: new Date("2026-04-01T18:00:00Z"),
            endsAt: null,
            locationType: "IN_PERSON",
            locationName: null,
            locationAddress: null,
            videoLink: null,
            capacity: null,
            price: 0,
            currency: "EUR",
          },
          {
            momentRepository: momentRepo,
            circleRepository: circleRepo,
            registrationRepository: registrationRepo,
          }
        )
      ).rejects.toThrow(UnauthorizedMomentActionError);

      expect(momentRepo.create).not.toHaveBeenCalled();
    });
  });

  describe("updateMoment — IDOR : HOST d'un autre Circle tente de modifier un Moment", () => {
    it("should throw UnauthorizedMomentActionError when a HOST of Circle B tries to update a Moment belonging to Circle A", async () => {
      // Le Moment appartient à circle-a
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(makeMoment({ circleId: "circle-a" })),
      });
      // L'attaquant n'est pas membre de circle-a
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(null),
      });

      await expect(
        updateMoment(
          { momentId: "moment-1", userId: "user-attacker", title: "Hijacked" },
          { momentRepository: momentRepo, circleRepository: circleRepo }
        )
      ).rejects.toThrow(UnauthorizedMomentActionError);

      // Vérifier que la vérification d'appartenance a bien été faite sur circle-a
      expect(circleRepo.findMembership).toHaveBeenCalledWith("circle-a", "user-attacker");
      expect(momentRepo.update).not.toHaveBeenCalled();
    });
  });

  describe("deleteMoment — IDOR : HOST d'un autre Circle tente de supprimer un Moment", () => {
    it("should throw UnauthorizedMomentActionError when a HOST of Circle B tries to delete a Moment belonging to Circle A", async () => {
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(makeMoment({ circleId: "circle-a" })),
        delete: vi.fn().mockResolvedValue(undefined),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(null),
      });

      await expect(
        deleteMoment(
          { momentId: "moment-1", userId: "user-attacker" },
          { momentRepository: momentRepo, circleRepository: circleRepo }
        )
      ).rejects.toThrow(UnauthorizedMomentActionError);

      expect(momentRepo.delete).not.toHaveBeenCalled();
    });
  });

  describe("getMomentRegistrations — IDOR : HOST d'un autre Circle tente d'accéder aux inscriptions", () => {
    it("should throw UnauthorizedMomentActionError when a HOST of Circle B tries to read registrations of a Moment in Circle A", async () => {
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(makeMoment({ circleId: "circle-a" })),
      });
      const circleRepo = createMockCircleRepository({
        // HOST de circle-b, pas membre de circle-a
        findMembership: vi.fn().mockResolvedValue(null),
      });
      const registrationRepo = createMockRegistrationRepository();

      await expect(
        getMomentRegistrations(
          { momentId: "moment-1", userId: "user-attacker" },
          {
            momentRepository: momentRepo,
            circleRepository: circleRepo,
            registrationRepository: registrationRepo,
          }
        )
      ).rejects.toThrow(UnauthorizedMomentActionError);

      expect(registrationRepo.findActiveWithUserByMomentId).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // IDOR — Registration (accès via registrationId d'un autre user)
  // ─────────────────────────────────────────────────────────────

  describe("cancelRegistration — IDOR : User tente d'annuler la registration d'un autre User", () => {
    it("should throw UnauthorizedRegistrationActionError when user-attacker tries to cancel user-victim's registration", async () => {
      // La registration appartient à user-victim
      const registrationRepo = createMockRegistrationRepository({
        findById: vi.fn().mockResolvedValue(
          makeRegistration({ userId: "user-victim", status: "REGISTERED" })
        ),
      });
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(makeMoment()),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(null),
      });

      // user-attacker (pas user-victim) tente l'annulation
      await expect(
        cancelRegistration(
          { registrationId: "reg-victim", userId: "user-attacker" },
          {
            registrationRepository: registrationRepo,
            momentRepository: momentRepo,
            circleRepository: circleRepo,
          }
        )
      ).rejects.toThrow(UnauthorizedRegistrationActionError);

      // La registration ne doit pas être modifiée
      expect(registrationRepo.update).not.toHaveBeenCalled();
    });

    it("should allow user-victim to cancel their own registration (positive case)", async () => {
      const cancelled = makeRegistration({
        userId: "user-victim",
        status: "CANCELLED",
        cancelledAt: new Date(),
      });
      const registrationRepo = createMockRegistrationRepository({
        findById: vi.fn().mockResolvedValue(
          makeRegistration({ userId: "user-victim", status: "REGISTERED" })
        ),
        update: vi.fn().mockResolvedValue(cancelled),
        findFirstWaitlisted: vi.fn().mockResolvedValue(null),
      });
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(makeMoment({ circleId: "circle-a" })),
      });
      const circleRepo = createMockCircleRepository({
        // user-victim est PLAYER, pas HOST
        findMembership: vi.fn().mockResolvedValue(
          makeMembership({ userId: "user-victim", role: "PLAYER" })
        ),
      });

      const result = await cancelRegistration(
        { registrationId: "reg-victim", userId: "user-victim" },
        {
          registrationRepository: registrationRepo,
          momentRepository: momentRepo,
          circleRepository: circleRepo,
        }
      );
      expect(result.registration.status).toBe("CANCELLED");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // IDOR — Comment (HOST d'un autre Circle tente de supprimer)
  // ─────────────────────────────────────────────────────────────

  describe("deleteComment — IDOR : HOST d'un autre Circle tente de supprimer un commentaire", () => {
    it("should throw UnauthorizedCommentDeletionError when a HOST of Circle B tries to delete a comment in Circle A", async () => {
      // Le commentaire est dans un Moment de circle-a
      const comment = makeComment({ userId: "user-author", momentId: "moment-in-circle-a" });
      const moment = makeMoment({ id: "moment-in-circle-a", circleId: "circle-a" });

      const commentRepo = createMockCommentRepository({
        findById: vi.fn().mockResolvedValue(comment),
        delete: vi.fn().mockResolvedValue(undefined),
      });
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(moment),
      });
      const circleRepo = createMockCircleRepository({
        // L'attaquant est HOST de circle-b mais findMembership("circle-a", ...) → null
        findMembership: vi.fn().mockResolvedValue(null),
      });

      await expect(
        deleteComment(
          { commentId: "comment-1", userId: "host-of-circle-b" },
          {
            commentRepository: commentRepo,
            momentRepository: momentRepo,
            circleRepository: circleRepo,
          }
        )
      ).rejects.toThrow(UnauthorizedCommentDeletionError);

      expect(commentRepo.delete).not.toHaveBeenCalled();
    });

    it("should allow a HOST of Circle A to delete a comment in Circle A (positive case)", async () => {
      const comment = makeComment({ userId: "user-author", momentId: "moment-in-circle-a" });
      const moment = makeMoment({ id: "moment-in-circle-a", circleId: "circle-a" });

      const commentRepo = createMockCommentRepository({
        findById: vi.fn().mockResolvedValue(comment),
        delete: vi.fn().mockResolvedValue(undefined),
      });
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(moment),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(
          makeMembership({ userId: "host-of-circle-a", circleId: "circle-a", role: "HOST" })
        ),
      });

      await expect(
        deleteComment(
          { commentId: "comment-1", userId: "host-of-circle-a" },
          {
            commentRepository: commentRepo,
            momentRepository: momentRepo,
            circleRepository: circleRepo,
          }
        )
      ).resolves.toBeUndefined();
      expect(commentRepo.delete).toHaveBeenCalledWith("comment-1");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Cas de contrôle positif : vérification que le lookup se fait
  // sur le bon circleId (circle du Moment, pas l'input userId)
  // ─────────────────────────────────────────────────────────────

  describe("updateMoment — vérification que le lookup membership porte sur le Circle du Moment", () => {
    it("should check membership on the Moment's circleId, not on any user-supplied value", async () => {
      const targetCircleId = "circle-from-moment";
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(makeMoment({ circleId: targetCircleId })),
        update: vi.fn().mockResolvedValue(makeMoment({ title: "OK" })),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(
          makeMembership({ circleId: targetCircleId, role: "HOST" })
        ),
      });

      await updateMoment(
        { momentId: "moment-1", userId: "legitimate-host", title: "OK" },
        { momentRepository: momentRepo, circleRepository: circleRepo }
      );

      // Doit vérifier membership sur le circleId provenant du Moment (pas d'une entrée externe)
      expect(circleRepo.findMembership).toHaveBeenCalledWith(targetCircleId, "legitimate-host");
    });
  });
});
