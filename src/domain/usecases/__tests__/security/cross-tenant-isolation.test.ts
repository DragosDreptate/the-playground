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
import { joinMoment } from "@/domain/usecases/join-moment";
import { getUserDashboardCircles } from "@/domain/usecases/get-user-dashboard-circles";

// Erreurs domaine
import {
  UnauthorizedCircleActionError,
  UnauthorizedMomentActionError,
  UnauthorizedRegistrationActionError,
  UnauthorizedCommentDeletionError,
  MomentNotOpenForRegistrationError,
} from "@/domain/errors";

// Types domaine
import type { DashboardCircle } from "@/domain/models/circle";

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

  // ─────────────────────────────────────────────────────────────
  // IDOR — deleteMoment : vérification que le lookup membership
  // porte sur le Circle du Moment (isolation circleId)
  // ─────────────────────────────────────────────────────────────

  describe("deleteMoment — vérification que le lookup membership porte sur le Circle du Moment", () => {
    it("should check membership on the Moment's circleId, not on any user-supplied value", async () => {
      const targetCircleId = "circle-from-moment";
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(makeMoment({ circleId: targetCircleId })),
        delete: vi.fn().mockResolvedValue(undefined),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(
          makeMembership({ circleId: targetCircleId, role: "HOST" })
        ),
      });

      await deleteMoment(
        { momentId: "moment-1", userId: "legitimate-host" },
        { momentRepository: momentRepo, circleRepository: circleRepo }
      );

      expect(circleRepo.findMembership).toHaveBeenCalledWith(targetCircleId, "legitimate-host");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // IDOR — getMomentRegistrations : vérification que le lookup
  // membership porte sur le Circle du Moment (isolation circleId)
  // ─────────────────────────────────────────────────────────────

  describe("getMomentRegistrations — vérification que le lookup membership porte sur le Circle du Moment", () => {
    it("should check membership on the Moment's circleId, not on any user-supplied value", async () => {
      const targetCircleId = "circle-from-moment";
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(makeMoment({ circleId: targetCircleId })),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(
          makeMembership({ circleId: targetCircleId, role: "HOST" })
        ),
      });
      const registrationRepo = createMockRegistrationRepository({
        findActiveWithUserByMomentId: vi.fn().mockResolvedValue([]),
      });

      await getMomentRegistrations(
        { momentId: "moment-1", userId: "legitimate-host" },
        {
          momentRepository: momentRepo,
          circleRepository: circleRepo,
          registrationRepository: registrationRepo,
        }
      );

      expect(circleRepo.findMembership).toHaveBeenCalledWith(targetCircleId, "legitimate-host");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // IDOR — joinMoment : isolation Circle via le Moment
  //
  // Scénario : user-attacker essaie de rejoindre un Moment
  // dont le statut est CANCELLED (non éligible à l'inscription).
  // L'accès au Moment lui-même est public (page partageable),
  // mais la logique de joinMoment protège l'intégrité.
  // ─────────────────────────────────────────────────────────────

  describe("joinMoment — protection contre l'inscription sur un Moment non ouvert", () => {
    it.each([
      ["CANCELLED", "CANCELLED" as const],
      ["PAST", "PAST" as const],
    ])(
      "should throw MomentNotOpenForRegistrationError when Moment status is %s",
      async (_label, status) => {
        const momentRepo = createMockMomentRepository({
          findById: vi.fn().mockResolvedValue(
            makeMoment({
              id: "moment-1",
              status,
              startsAt: new Date("2099-01-01T18:00:00Z"),
              price: 0,
            })
          ),
        });
        const registrationRepo = createMockRegistrationRepository();
        const circleRepo = createMockCircleRepository();

        await expect(
          joinMoment(
            { momentId: "moment-1", userId: "user-attacker" },
            {
              momentRepository: momentRepo,
              registrationRepository: registrationRepo,
              circleRepository: circleRepo,
            }
          )
        ).rejects.toThrow(MomentNotOpenForRegistrationError);

        // Aucune inscription ne doit être créée
        expect(registrationRepo.create).not.toHaveBeenCalled();
        // Aucun membership ne doit être ajouté
        expect(circleRepo.addMembership).not.toHaveBeenCalled();
      }
    );

    it("should NOT add Circle membership when registration is rejected", async () => {
      // Si l'inscription échoue (Moment fermé), pas de membership parasite créé
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(
          makeMoment({ id: "moment-1", status: "CANCELLED", price: 0 })
        ),
      });
      const registrationRepo = createMockRegistrationRepository();
      const circleRepo = createMockCircleRepository({
        addMembership: vi.fn(),
      });

      await expect(
        joinMoment(
          { momentId: "moment-1", userId: "user-a" },
          {
            momentRepository: momentRepo,
            registrationRepository: registrationRepo,
            circleRepository: circleRepo,
          }
        )
      ).rejects.toThrow(MomentNotOpenForRegistrationError);

      expect(circleRepo.addMembership).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Vérification de la combinaison d'attaques : un attaquant
  // HOST de circle-b tente de lire les inscriptions d'un Moment
  // appartenant à circle-a en fournissant un momentId valide.
  // L'isolation repose sur le fait que findMembership est appelé
  // avec le circleId du Moment (circle-a), pas celui de l'attaquant.
  // ─────────────────────────────────────────────────────────────

  describe("getMomentRegistrations — combinaison IDOR : HOST circle-b cible Moment circle-a", () => {
    it("should throw UnauthorizedMomentActionError and never expose registrations data", async () => {
      // L'attaquant connait le momentId public (URL /m/slug) mais n'est pas HOST de circle-a
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(makeMoment({ circleId: "circle-a" })),
      });
      // findMembership("circle-a", "host-of-circle-b") → null (pas membre de circle-a)
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockImplementation((circleId: string) => {
          if (circleId === "circle-b") {
            return Promise.resolve(
              makeMembership({ userId: "host-of-circle-b", circleId: "circle-b", role: "HOST" })
            );
          }
          return Promise.resolve(null); // pas membre de circle-a
        }),
      });
      const registrationRepo = createMockRegistrationRepository({
        findActiveWithUserByMomentId: vi.fn().mockResolvedValue([]),
      });

      await expect(
        getMomentRegistrations(
          { momentId: "moment-in-circle-a", userId: "host-of-circle-b" },
          {
            momentRepository: momentRepo,
            circleRepository: circleRepo,
            registrationRepository: registrationRepo,
          }
        )
      ).rejects.toThrow(UnauthorizedMomentActionError);

      // Les données d'inscription ne doivent jamais être lues
      expect(registrationRepo.findActiveWithUserByMomentId).not.toHaveBeenCalled();
      // Vérifie que le check a bien été fait sur circle-a (le Circle du Moment)
      expect(circleRepo.findMembership).toHaveBeenCalledWith("circle-a", "host-of-circle-b");
    });
  });
});

// ─────────────────────────────────────────────────────────────
// IDOR — getUserDashboardCircles
//
// Ce usecase n'a pas de garde d'autorisation interne.
// La défense repose sur deux couches :
//   1. Le caller (page Next.js) injecte `session.user.id`
//   2. Le repository scope toutes les requêtes WHERE userId = ?
//
// Le risque d'IDOR est différent ici : un attaquant ne peut pas
// substituer un userId via une action directe (le userId vient
// de la session côté serveur). Mais il faut vérifier que le
// usecase transmet le userId exactement tel quel, sans
// modification ni contamination croisée entre utilisateurs.
// ─────────────────────────────────────────────────────────────

function makeDashboardCircleForSecurity(
  overrides: Partial<DashboardCircle> = {}
): DashboardCircle {
  return {
    ...makeCircle(),
    memberRole: "HOST",
    memberCount: 1,
    upcomingMomentCount: 0,
    nextMoment: null,
    ...overrides,
  };
}

describe("Security — Cross-Tenant Isolation (IDOR) — getUserDashboardCircles", () => {
  describe("getUserDashboardCircles — isolation userId : pas de fuite de données cross-tenant", () => {
    it("should scope the repository query to the exact userId provided — user A cannot see user B's circles", async () => {
      // user-alice a 2 circles, user-bob a 0 circles
      // Appeler le usecase avec user-alice ne doit JAMAIS retourner les circles de user-bob
      const aliceCircles: DashboardCircle[] = [
        makeDashboardCircleForSecurity({ id: "alice-circle-1", name: "Alice Circle" }),
        makeDashboardCircleForSecurity({ id: "alice-circle-2", name: "Alice Circle 2" }),
      ];

      const circleRepo = createMockCircleRepository({
        findAllByUserIdWithStats: vi.fn().mockImplementation((uid: string) => {
          if (uid === "user-alice") return Promise.resolve(aliceCircles);
          return Promise.resolve([]);
        }),
      });

      // user-alice obtient ses 2 circles
      const aliceResult = await getUserDashboardCircles("user-alice", {
        circleRepository: circleRepo,
      });
      // user-bob n'obtient aucun circle
      const bobResult = await getUserDashboardCircles("user-bob", {
        circleRepository: circleRepo,
      });

      expect(aliceResult).toHaveLength(2);
      expect(aliceResult.map((c) => c.id)).toContain("alice-circle-1");
      expect(bobResult).toHaveLength(0);

      // Le repository a bien été appelé avec chaque userId séparément
      expect(circleRepo.findAllByUserIdWithStats).toHaveBeenCalledWith("user-alice");
      expect(circleRepo.findAllByUserIdWithStats).toHaveBeenCalledWith("user-bob");
    });

    it("should call findAllByUserIdWithStats with the exact userId — no substitution", async () => {
      // Vérifie que le usecase ne modifie pas le userId avant de le passer au repo
      const circleRepo = createMockCircleRepository({
        findAllByUserIdWithStats: vi.fn().mockResolvedValue([]),
      });

      await getUserDashboardCircles("user-victim", { circleRepository: circleRepo });

      // Le repo est bien appelé avec user-victim, pas un autre userId
      expect(circleRepo.findAllByUserIdWithStats).toHaveBeenCalledWith("user-victim");
      expect(circleRepo.findAllByUserIdWithStats).toHaveBeenCalledTimes(1);
    });

    it("should not mix data between concurrent calls for different users", async () => {
      // Simule des appels concurrents pour 3 users différents
      // Chaque userId doit être transmis exactement une fois sans contamination
      const callLog: string[] = [];

      const circleRepo = createMockCircleRepository({
        findAllByUserIdWithStats: vi.fn().mockImplementation((uid: string) => {
          callLog.push(uid);
          return Promise.resolve(
            uid === "user-host"
              ? [makeDashboardCircleForSecurity({ id: "host-circle", memberRole: "HOST" })]
              : []
          );
        }),
      });

      const [hostResult, playerResult, strangerResult] = await Promise.all([
        getUserDashboardCircles("user-host", { circleRepository: circleRepo }),
        getUserDashboardCircles("user-player", { circleRepository: circleRepo }),
        getUserDashboardCircles("user-stranger", { circleRepository: circleRepo }),
      ]);

      // user-host voit son circle, les autres voient rien
      expect(hostResult).toHaveLength(1);
      expect(hostResult[0].id).toBe("host-circle");
      expect(playerResult).toHaveLength(0);
      expect(strangerResult).toHaveLength(0);

      // Chaque userId est transmis exactement une fois
      expect(callLog.filter((id) => id === "user-host")).toHaveLength(1);
      expect(callLog.filter((id) => id === "user-player")).toHaveLength(1);
      expect(callLog.filter((id) => id === "user-stranger")).toHaveLength(1);
    });

    it("should allow a legitimate user to retrieve their own circles (positive case)", async () => {
      // Cas positif : un utilisateur normal accède à ses propres circles
      const myCircles: DashboardCircle[] = [
        makeDashboardCircleForSecurity({
          id: "my-circle",
          name: "My Community",
          memberRole: "PLAYER",
          memberCount: 10,
          upcomingMomentCount: 1,
          nextMoment: { title: "Prochain événement", startsAt: new Date("2026-04-01T18:00:00Z") },
        }),
      ];

      const circleRepo = createMockCircleRepository({
        findAllByUserIdWithStats: vi.fn().mockResolvedValue(myCircles),
      });

      const result = await getUserDashboardCircles("user-legitimate", {
        circleRepository: circleRepo,
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("My Community");
      expect(result[0].memberRole).toBe("PLAYER");
      expect(result[0].nextMoment?.title).toBe("Prochain événement");
    });
  });
});
