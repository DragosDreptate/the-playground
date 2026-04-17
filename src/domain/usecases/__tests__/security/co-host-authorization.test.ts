/**
 * Tests de sécurité RBAC — feature co-organisateurs (CO_HOST)
 *
 * Vérifie la matrice d'autorisation introduite par la feature co-organisateurs :
 * - Un CO_HOST a les droits de gestion étendus (créer/éditer événements, approuver inscriptions...)
 * - Un CO_HOST ne peut pas supprimer la Communauté (D3), gérer Stripe (D15),
 *   annuler sa propre inscription (D16), ni promouvoir/rétrograder d'autres membres (D3)
 * - Un membre PENDING n'a pas les droits d'Organisateur même avec rôle CO_HOST (D17)
 * - Un PLAYER PENDING ne peut pas être promu (D22)
 * - La promotion/rétrogradation modifie immédiatement les droits effectifs
 */

import { describe, it, expect, vi } from "vitest";

import { createMoment } from "@/domain/usecases/create-moment";
import { updateMoment } from "@/domain/usecases/update-moment";
import { publishMoment } from "@/domain/usecases/publish-moment";
import { deleteCircle } from "@/domain/usecases/delete-circle";
import { onboardStripeConnect } from "@/domain/usecases/onboard-stripe-connect";
import { cancelRegistration } from "@/domain/usecases/cancel-registration";
import { promoteToCoHost } from "@/domain/usecases/promote-to-co-host";
import { demoteFromCoHost } from "@/domain/usecases/demote-from-co-host";
import { approveMomentRegistration } from "@/domain/usecases/approve-moment-registration";
import { updateCircle } from "@/domain/usecases/update-circle";

import {
  UnauthorizedCircleActionError,
  UnauthorizedMomentActionError,
  OrganizerCannotCancelRegistrationError,
  CannotPromotePendingMemberError,
} from "@/domain/errors";

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
import { createMockUserRepository } from "../helpers/mock-user-repository";
import { createMockPaymentService } from "../helpers/mock-payment-service";

const CIRCLE_ID = "circle-1";
const MOMENT_ID = "moment-1";
const HOST_ID = "host-user";
const CO_HOST_ID = "co-host-user";
const PLAYER_ID = "player-user";

// ─────────────────────────────────────────────────────────────
// CO_HOST a les mêmes droits qu'un HOST sur les actions standard
// ─────────────────────────────────────────────────────────────

describe("CO_HOST security — actions autorisées (D13)", () => {
  it("should allow a CO_HOST ACTIVE to create a Moment", async () => {
    const circleRepo = createMockCircleRepository({
      findMembership: vi.fn().mockResolvedValue(
        makeMembership({ userId: CO_HOST_ID, role: "CO_HOST", status: "ACTIVE" })
      ),
      findById: vi.fn().mockResolvedValue(makeCircle()),
    });
    const momentRepo = createMockMomentRepository({
      slugExists: vi.fn().mockResolvedValue(false),
    });

    await expect(
      createMoment(
        {
          circleId: CIRCLE_ID,
          userId: CO_HOST_ID,
          title: "Test",
          description: "d",
          startsAt: new Date(Date.now() + 3600_000),
          endsAt: null,
          locationType: "ONLINE",
          locationName: null,
          locationAddress: null,
          videoLink: "https://meet.example.com",
          capacity: null,
          price: 0,
          currency: "EUR",
          refundable: true,
          requiresApproval: false,
        },
        {
          momentRepository: momentRepo,
          circleRepository: circleRepo,
          registrationRepository: createMockRegistrationRepository(),
        }
      )
    ).resolves.toBeDefined();
  });

  it("should allow a CO_HOST ACTIVE to approve a moment registration", async () => {
    const circleRepo = createMockCircleRepository({
      findById: vi.fn().mockResolvedValue(makeCircle()),
      findMembership: vi.fn().mockResolvedValue(
        makeMembership({ userId: CO_HOST_ID, role: "CO_HOST", status: "ACTIVE" })
      ),
    });
    const registration = makeRegistration({
      status: "PENDING_APPROVAL",
      userId: PLAYER_ID,
      momentId: MOMENT_ID,
    });
    const momentRepo = createMockMomentRepository({
      findById: vi.fn().mockResolvedValue(makeMoment({ id: MOMENT_ID })),
    });
    const registrationRepo = createMockRegistrationRepository({
      findById: vi.fn().mockResolvedValue(registration),
      countByMomentIdAndStatus: vi.fn().mockResolvedValue(0),
      update: vi.fn().mockResolvedValue({ ...registration, status: "REGISTERED" }),
    });

    await expect(
      approveMomentRegistration(
        { registrationId: registration.id, hostUserId: CO_HOST_ID },
        {
          registrationRepository: registrationRepo,
          momentRepository: momentRepo,
          circleRepository: circleRepo,
        }
      )
    ).resolves.toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────
// CO_HOST — actions refusées
// ─────────────────────────────────────────────────────────────

describe("CO_HOST security — actions réservées au HOST (D3, D15)", () => {
  it("should throw when a CO_HOST tries to delete the Circle (D3)", async () => {
    const circleRepo = createMockCircleRepository({
      findById: vi.fn().mockResolvedValue(makeCircle()),
      findMembership: vi.fn().mockResolvedValue(
        makeMembership({ userId: CO_HOST_ID, role: "CO_HOST", status: "ACTIVE" })
      ),
    });

    await expect(
      deleteCircle(
        { circleId: CIRCLE_ID, userId: CO_HOST_ID },
        { circleRepository: circleRepo }
      )
    ).rejects.toThrow(UnauthorizedCircleActionError);
  });

  it("should throw when a CO_HOST tries to onboard Stripe Connect (D15)", async () => {
    const circleRepo = createMockCircleRepository({
      findById: vi.fn().mockResolvedValue(makeCircle()),
      findMembership: vi.fn().mockResolvedValue(
        makeMembership({ userId: CO_HOST_ID, role: "CO_HOST", status: "ACTIVE" })
      ),
    });

    await expect(
      onboardStripeConnect(
        { circleId: CIRCLE_ID, userId: CO_HOST_ID, returnUrl: "https://example.com/r" },
        {
          circleRepository: circleRepo,
          paymentService: createMockPaymentService(),
        }
      )
    ).rejects.toThrow(UnauthorizedCircleActionError);
  });

  it("should throw when a CO_HOST tries to cancel their own registration (D16)", async () => {
    const registration = makeRegistration({
      userId: CO_HOST_ID,
      momentId: MOMENT_ID,
      status: "REGISTERED",
    });
    const momentRepo = createMockMomentRepository({
      findById: vi.fn().mockResolvedValue(makeMoment({ circleId: CIRCLE_ID })),
    });
    const circleRepo = createMockCircleRepository({
      findMembership: vi.fn().mockResolvedValue(
        makeMembership({ userId: CO_HOST_ID, role: "CO_HOST", status: "ACTIVE" })
      ),
    });
    const registrationRepo = createMockRegistrationRepository({
      findById: vi.fn().mockResolvedValue(registration),
    });

    await expect(
      cancelRegistration(
        { registrationId: registration.id, userId: CO_HOST_ID },
        {
          registrationRepository: registrationRepo,
          momentRepository: momentRepo,
          circleRepository: circleRepo,
        }
      )
    ).rejects.toThrow(OrganizerCannotCancelRegistrationError);
  });

  it("should throw when a CO_HOST tries to promote another PLAYER", async () => {
    const circleRepo = createMockCircleRepository({
      findMembership: vi.fn().mockResolvedValue(
        makeMembership({ userId: CO_HOST_ID, role: "CO_HOST", status: "ACTIVE" })
      ),
    });

    await expect(
      promoteToCoHost(
        { circleId: CIRCLE_ID, hostUserId: CO_HOST_ID, targetUserId: PLAYER_ID },
        {
          circleRepository: circleRepo,
          userRepository: createMockUserRepository(),
        }
      )
    ).rejects.toThrow(UnauthorizedCircleActionError);
  });

  it("should throw when a CO_HOST tries to demote another CO_HOST", async () => {
    const circleRepo = createMockCircleRepository({
      findMembership: vi.fn().mockResolvedValue(
        makeMembership({ userId: CO_HOST_ID, role: "CO_HOST", status: "ACTIVE" })
      ),
    });

    await expect(
      demoteFromCoHost(
        { circleId: CIRCLE_ID, hostUserId: CO_HOST_ID, targetUserId: "other-co-host" },
        {
          circleRepository: circleRepo,
          userRepository: createMockUserRepository(),
        }
      )
    ).rejects.toThrow(UnauthorizedCircleActionError);
  });
});

// ─────────────────────────────────────────────────────────────
// Statut PENDING — aucun droit (D17)
// ─────────────────────────────────────────────────────────────

describe("CO_HOST security — statut PENDING (D17)", () => {
  it("should throw when a PENDING CO_HOST tries to create a Moment", async () => {
    const circleRepo = createMockCircleRepository({
      findMembership: vi.fn().mockResolvedValue(
        makeMembership({ userId: CO_HOST_ID, role: "CO_HOST", status: "PENDING" })
      ),
    });

    await expect(
      createMoment(
        {
          circleId: CIRCLE_ID,
          userId: CO_HOST_ID,
          title: "Test",
          description: "d",
          startsAt: new Date(Date.now() + 3600_000),
          endsAt: null,
          locationType: "ONLINE",
          locationName: null,
          locationAddress: null,
          videoLink: "https://meet.example.com",
          capacity: null,
          price: 0,
          currency: "EUR",
          refundable: true,
          requiresApproval: false,
        },
        {
          momentRepository: createMockMomentRepository(),
          circleRepository: circleRepo,
          registrationRepository: createMockRegistrationRepository(),
        }
      )
    ).rejects.toThrow(UnauthorizedMomentActionError);
  });

  it("should throw when a PENDING CO_HOST tries to update the Circle", async () => {
    const circleRepo = createMockCircleRepository({
      findById: vi.fn().mockResolvedValue(makeCircle()),
      findMembership: vi.fn().mockResolvedValue(
        makeMembership({ userId: CO_HOST_ID, role: "CO_HOST", status: "PENDING" })
      ),
    });

    await expect(
      updateCircle(
        { circleId: CIRCLE_ID, userId: CO_HOST_ID, name: "Updated" },
        { circleRepository: circleRepo }
      )
    ).rejects.toThrow(UnauthorizedCircleActionError);
  });
});

// ─────────────────────────────────────────────────────────────
// Promotion d'un PENDING refusée (D22)
// ─────────────────────────────────────────────────────────────

describe("CO_HOST security — D22 (promotion d'un PENDING refusée)", () => {
  it("should throw CannotPromotePendingMemberError", async () => {
    const circleRepo = createMockCircleRepository({
      findMembership: vi
        .fn()
        .mockResolvedValueOnce(
          makeMembership({ userId: HOST_ID, role: "HOST", status: "ACTIVE" })
        )
        .mockResolvedValueOnce(
          makeMembership({ userId: PLAYER_ID, role: "PLAYER", status: "PENDING" })
        ),
    });

    await expect(
      promoteToCoHost(
        { circleId: CIRCLE_ID, hostUserId: HOST_ID, targetUserId: PLAYER_ID },
        {
          circleRepository: circleRepo,
          userRepository: createMockUserRepository(),
        }
      )
    ).rejects.toThrow(CannotPromotePendingMemberError);
  });
});

// ─────────────────────────────────────────────────────────────
// Acquisition / perte immédiate des droits
// ─────────────────────────────────────────────────────────────

describe("CO_HOST security — transition de rôle", () => {
  it("should grant management rights immediately after promotion", async () => {
    // Simule le state APRÈS promotion : le membre est désormais CO_HOST ACTIVE
    const circleRepo = createMockCircleRepository({
      findMembership: vi.fn().mockResolvedValue(
        makeMembership({ userId: PLAYER_ID, role: "CO_HOST", status: "ACTIVE" })
      ),
      findById: vi.fn().mockResolvedValue(makeCircle()),
    });
    const momentRepo = createMockMomentRepository({
      findById: vi.fn().mockResolvedValue(makeMoment({ status: "DRAFT" })),
    });

    // L'ancien PLAYER peut désormais publier un événement
    await expect(
      publishMoment(
        { momentId: MOMENT_ID, userId: PLAYER_ID },
        {
          momentRepository: momentRepo,
          circleRepository: circleRepo,
        }
      )
    ).resolves.toBeDefined();
  });

  it("should revoke management rights immediately after demotion", async () => {
    // Simule le state APRÈS rétrogradation : le membre est redevenu PLAYER
    const circleRepo = createMockCircleRepository({
      findMembership: vi.fn().mockResolvedValue(
        makeMembership({ userId: CO_HOST_ID, role: "PLAYER", status: "ACTIVE" })
      ),
    });
    const momentRepo = createMockMomentRepository({
      findById: vi.fn().mockResolvedValue(makeMoment({ status: "DRAFT" })),
    });

    await expect(
      updateMoment(
        {
          momentId: MOMENT_ID,
          userId: CO_HOST_ID,
          title: "Updated",
        },
        {
          momentRepository: momentRepo,
          circleRepository: circleRepo,
          registrationRepository: createMockRegistrationRepository(),
        }
      )
    ).rejects.toThrow(UnauthorizedMomentActionError);
  });
});
