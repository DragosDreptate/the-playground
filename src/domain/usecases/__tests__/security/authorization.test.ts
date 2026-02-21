/**
 * Tests de sécurité — RBAC (Role-Based Access Control)
 *
 * Vérifie que chaque usecase protégé refuse correctement l'accès aux utilisateurs
 * sans les droits requis, et autorise les utilisateurs légitimes.
 *
 * Convention BDD : describe("[usecase] — [type de contrôle]") / it("should throw / should allow")
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
  HostCannotCancelRegistrationError,
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
// updateCircle — RBAC
// ─────────────────────────────────────────────────────────────

describe("Security — RBAC", () => {
  describe("updateCircle — contrôle de rôle", () => {
    const input = { circleId: "circle-1", userId: "user-x", name: "Updated" };

    it.each([
      ["PLAYER", makeMembership({ role: "PLAYER" })],
      ["non-membre", null],
    ])(
      "should throw UnauthorizedCircleActionError when a %s attempts to update a Circle",
      async (_label, membership) => {
        const circleRepo = createMockCircleRepository({
          findById: vi.fn().mockResolvedValue(makeCircle()),
          findMembership: vi.fn().mockResolvedValue(membership),
        });

        await expect(
          updateCircle(input, { circleRepository: circleRepo })
        ).rejects.toThrow(UnauthorizedCircleActionError);
      }
    );

    it("should allow a HOST to update a Circle", async () => {
      const updated = makeCircle({ name: "Updated" });
      const circleRepo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(makeCircle()),
        findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "HOST" })),
        update: vi.fn().mockResolvedValue(updated),
      });

      const result = await updateCircle(input, { circleRepository: circleRepo });
      expect(result.circle.name).toBe("Updated");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // deleteCircle — RBAC
  // ─────────────────────────────────────────────────────────────

  describe("deleteCircle — contrôle de rôle", () => {
    const input = { circleId: "circle-1", userId: "user-x" };

    it.each([
      ["PLAYER", makeMembership({ role: "PLAYER" })],
      ["non-membre", null],
    ])(
      "should throw UnauthorizedCircleActionError when a %s attempts to delete a Circle",
      async (_label, membership) => {
        const circleRepo = createMockCircleRepository({
          findById: vi.fn().mockResolvedValue(makeCircle()),
          findMembership: vi.fn().mockResolvedValue(membership),
        });

        await expect(
          deleteCircle(input, { circleRepository: circleRepo })
        ).rejects.toThrow(UnauthorizedCircleActionError);
      }
    );

    it("should allow a HOST to delete a Circle", async () => {
      const circleRepo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(makeCircle()),
        findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "HOST" })),
        delete: vi.fn().mockResolvedValue(undefined),
      });

      await expect(
        deleteCircle(input, { circleRepository: circleRepo })
      ).resolves.toBeUndefined();
      expect(circleRepo.delete).toHaveBeenCalledWith("circle-1");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // createMoment — RBAC
  // ─────────────────────────────────────────────────────────────

  describe("createMoment — contrôle de rôle", () => {
    const baseInput = {
      circleId: "circle-1",
      userId: "user-x",
      title: "Test Moment",
      description: "Description",
      startsAt: new Date("2026-04-01T18:00:00Z"),
      endsAt: null,
      locationType: "IN_PERSON" as const,
      locationName: null,
      locationAddress: null,
      videoLink: null,
      capacity: null,
      price: 0,
      currency: "EUR",
    };

    it.each([
      ["PLAYER", makeMembership({ role: "PLAYER" })],
      ["non-membre", null],
    ])(
      "should throw UnauthorizedMomentActionError when a %s attempts to create a Moment",
      async (_label, membership) => {
        const circleRepo = createMockCircleRepository({
          findMembership: vi.fn().mockResolvedValue(membership),
        });
        const momentRepo = createMockMomentRepository();
        const registrationRepo = createMockRegistrationRepository();

        await expect(
          createMoment(baseInput, {
            momentRepository: momentRepo,
            circleRepository: circleRepo,
            registrationRepository: registrationRepo,
          })
        ).rejects.toThrow(UnauthorizedMomentActionError);
      }
    );

    it("should allow a HOST to create a Moment", async () => {
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "HOST" })),
      });
      const momentRepo = createMockMomentRepository({
        create: vi.fn().mockResolvedValue(makeMoment({ title: "Test Moment" })),
      });
      const registrationRepo = createMockRegistrationRepository();

      const result = await createMoment(baseInput, {
        momentRepository: momentRepo,
        circleRepository: circleRepo,
        registrationRepository: registrationRepo,
      });
      expect(result.moment.title).toBe("Test Moment");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // updateMoment — RBAC
  // ─────────────────────────────────────────────────────────────

  describe("updateMoment — contrôle de rôle", () => {
    const input = { momentId: "moment-1", userId: "user-x", title: "New Title" };

    it.each([
      ["PLAYER", makeMembership({ role: "PLAYER" })],
      ["non-membre", null],
    ])(
      "should throw UnauthorizedMomentActionError when a %s attempts to update a Moment",
      async (_label, membership) => {
        const momentRepo = createMockMomentRepository({
          findById: vi.fn().mockResolvedValue(makeMoment({ circleId: "circle-1" })),
        });
        const circleRepo = createMockCircleRepository({
          findMembership: vi.fn().mockResolvedValue(membership),
        });

        await expect(
          updateMoment(input, {
            momentRepository: momentRepo,
            circleRepository: circleRepo,
          })
        ).rejects.toThrow(UnauthorizedMomentActionError);
      }
    );

    it("should allow a HOST to update a Moment", async () => {
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(makeMoment({ circleId: "circle-1" })),
        update: vi.fn().mockResolvedValue(makeMoment({ title: "New Title" })),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "HOST" })),
      });

      const result = await updateMoment(input, {
        momentRepository: momentRepo,
        circleRepository: circleRepo,
      });
      expect(result.moment.title).toBe("New Title");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // deleteMoment — RBAC
  // ─────────────────────────────────────────────────────────────

  describe("deleteMoment — contrôle de rôle", () => {
    const input = { momentId: "moment-1", userId: "user-x" };

    it.each([
      ["PLAYER", makeMembership({ role: "PLAYER" })],
      ["non-membre", null],
    ])(
      "should throw UnauthorizedMomentActionError when a %s attempts to delete a Moment",
      async (_label, membership) => {
        const momentRepo = createMockMomentRepository({
          findById: vi.fn().mockResolvedValue(makeMoment({ circleId: "circle-1" })),
        });
        const circleRepo = createMockCircleRepository({
          findMembership: vi.fn().mockResolvedValue(membership),
        });

        await expect(
          deleteMoment(input, {
            momentRepository: momentRepo,
            circleRepository: circleRepo,
          })
        ).rejects.toThrow(UnauthorizedMomentActionError);
      }
    );

    it("should allow a HOST to delete a Moment", async () => {
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(makeMoment({ circleId: "circle-1" })),
        delete: vi.fn().mockResolvedValue(undefined),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "HOST" })),
      });

      await expect(
        deleteMoment(input, {
          momentRepository: momentRepo,
          circleRepository: circleRepo,
        })
      ).resolves.toBeUndefined();
      expect(momentRepo.delete).toHaveBeenCalledWith("moment-1");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // getMomentRegistrations — RBAC
  // ─────────────────────────────────────────────────────────────

  describe("getMomentRegistrations — contrôle de rôle", () => {
    const input = { momentId: "moment-1", userId: "user-x" };

    it.each([
      ["PLAYER", makeMembership({ role: "PLAYER" })],
      ["non-membre", null],
    ])(
      "should throw UnauthorizedMomentActionError when a %s attempts to read registrations",
      async (_label, membership) => {
        const momentRepo = createMockMomentRepository({
          findById: vi.fn().mockResolvedValue(makeMoment()),
        });
        const circleRepo = createMockCircleRepository({
          findMembership: vi.fn().mockResolvedValue(membership),
        });
        const registrationRepo = createMockRegistrationRepository();

        await expect(
          getMomentRegistrations(input, {
            momentRepository: momentRepo,
            circleRepository: circleRepo,
            registrationRepository: registrationRepo,
          })
        ).rejects.toThrow(UnauthorizedMomentActionError);
      }
    );

    it("should allow a HOST to read registrations", async () => {
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(makeMoment()),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "HOST" })),
      });
      const registrationRepo = createMockRegistrationRepository({
        findActiveWithUserByMomentId: vi.fn().mockResolvedValue([]),
      });

      const result = await getMomentRegistrations(input, {
        momentRepository: momentRepo,
        circleRepository: circleRepo,
        registrationRepository: registrationRepo,
      });
      expect(result.registrations).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // cancelRegistration — RBAC
  // ─────────────────────────────────────────────────────────────

  describe("cancelRegistration — contrôle d'identité et rôle", () => {
    it("should throw UnauthorizedRegistrationActionError when a User tries to cancel another User's registration", async () => {
      const registrationRepo = createMockRegistrationRepository({
        findById: vi.fn().mockResolvedValue(
          makeRegistration({ userId: "user-owner", status: "REGISTERED" })
        ),
      });
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(makeMoment()),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(null),
      });

      // user-attacker tente d'annuler la registration de user-owner
      await expect(
        cancelRegistration(
          { registrationId: "reg-1", userId: "user-attacker" },
          {
            registrationRepository: registrationRepo,
            momentRepository: momentRepo,
            circleRepository: circleRepo,
          }
        )
      ).rejects.toThrow(UnauthorizedRegistrationActionError);
    });

    it("should throw HostCannotCancelRegistrationError when a HOST tries to cancel their own registration", async () => {
      const registrationRepo = createMockRegistrationRepository({
        findById: vi.fn().mockResolvedValue(
          makeRegistration({ userId: "host-user", status: "REGISTERED" })
        ),
      });
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(makeMoment({ circleId: "circle-1" })),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(
          makeMembership({ userId: "host-user", role: "HOST" })
        ),
      });

      await expect(
        cancelRegistration(
          { registrationId: "reg-1", userId: "host-user" },
          {
            registrationRepository: registrationRepo,
            momentRepository: momentRepo,
            circleRepository: circleRepo,
          }
        )
      ).rejects.toThrow(HostCannotCancelRegistrationError);
    });

    it("should allow a PLAYER to cancel their own registration", async () => {
      const cancelled = makeRegistration({
        userId: "player-user",
        status: "CANCELLED",
        cancelledAt: new Date(),
      });
      const registrationRepo = createMockRegistrationRepository({
        findById: vi.fn().mockResolvedValue(
          makeRegistration({ userId: "player-user", status: "REGISTERED" })
        ),
        update: vi.fn().mockResolvedValue(cancelled),
        findFirstWaitlisted: vi.fn().mockResolvedValue(null),
      });
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(makeMoment({ circleId: "circle-1" })),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(
          makeMembership({ userId: "player-user", role: "PLAYER" })
        ),
      });

      const result = await cancelRegistration(
        { registrationId: "reg-1", userId: "player-user" },
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
  // deleteComment — RBAC
  // ─────────────────────────────────────────────────────────────

  describe("deleteComment — contrôle de rôle", () => {
    it("should throw UnauthorizedCommentDeletionError when a PLAYER (non-author) attempts to delete a comment", async () => {
      // comment appartient à user-author, user-player tente de le supprimer
      const comment = makeComment({ userId: "user-author", momentId: "moment-1" });
      const moment = makeMoment({ id: "moment-1", circleId: "circle-1" });

      const commentRepo = createMockCommentRepository({
        findById: vi.fn().mockResolvedValue(comment),
      });
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(moment),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(
          makeMembership({ userId: "user-player", role: "PLAYER" })
        ),
      });

      await expect(
        deleteComment(
          { commentId: "comment-1", userId: "user-player" },
          {
            commentRepository: commentRepo,
            momentRepository: momentRepo,
            circleRepository: circleRepo,
          }
        )
      ).rejects.toThrow(UnauthorizedCommentDeletionError);
    });

    it("should throw UnauthorizedCommentDeletionError when a non-member attempts to delete a comment", async () => {
      const comment = makeComment({ userId: "user-author", momentId: "moment-1" });
      const moment = makeMoment({ id: "moment-1", circleId: "circle-1" });

      const commentRepo = createMockCommentRepository({
        findById: vi.fn().mockResolvedValue(comment),
      });
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(moment),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(null),
      });

      await expect(
        deleteComment(
          { commentId: "comment-1", userId: "stranger" },
          {
            commentRepository: commentRepo,
            momentRepository: momentRepo,
            circleRepository: circleRepo,
          }
        )
      ).rejects.toThrow(UnauthorizedCommentDeletionError);
    });

    it("should allow the comment author to delete their own comment", async () => {
      const comment = makeComment({ userId: "user-author" });
      const commentRepo = createMockCommentRepository({
        findById: vi.fn().mockResolvedValue(comment),
        delete: vi.fn().mockResolvedValue(undefined),
      });

      await expect(
        deleteComment(
          { commentId: "comment-1", userId: "user-author" },
          {
            commentRepository: commentRepo,
            momentRepository: createMockMomentRepository(),
            circleRepository: createMockCircleRepository(),
          }
        )
      ).resolves.toBeUndefined();
      expect(commentRepo.delete).toHaveBeenCalledWith("comment-1");
    });

    it("should allow a HOST of the Circle to delete any comment", async () => {
      const comment = makeComment({ userId: "user-author", momentId: "moment-1" });
      const moment = makeMoment({ id: "moment-1", circleId: "circle-1" });

      const commentRepo = createMockCommentRepository({
        findById: vi.fn().mockResolvedValue(comment),
        delete: vi.fn().mockResolvedValue(undefined),
      });
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(moment),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(
          makeMembership({ userId: "host-user", role: "HOST" })
        ),
      });

      await expect(
        deleteComment(
          { commentId: "comment-1", userId: "host-user" },
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
});
