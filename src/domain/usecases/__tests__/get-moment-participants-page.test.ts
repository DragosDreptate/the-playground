import { describe, it, expect, vi } from "vitest";
import { getMomentParticipantsPage } from "@/domain/usecases/get-moment-participants-page";
import {
  createMockMomentRepository,
  makeMoment,
} from "./helpers/mock-moment-repository";
import {
  createMockCircleRepository,
  makeCircle,
  makeMembership,
} from "./helpers/mock-circle-repository";
import {
  createMockRegistrationRepository,
  makeRegistration,
} from "./helpers/mock-registration-repository";
import type { RegistrationWithUser } from "@/domain/models/registration";
import {
  MomentNotFoundError,
  CircleNotFoundError,
  UnauthorizedMomentActionError,
} from "@/domain/errors";

function makeParticipant(): RegistrationWithUser {
  return {
    ...makeRegistration({
      stripePaymentIntentId: "pi_123",
      stripeReceiptUrl: "https://stripe.test/receipt/123",
    }),
    user: {
      id: "user-2",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      image: null,
      publicId: "pub-ada",
    },
  };
}

const MOMENT_ID = "moment-1";
const CIRCLE_ID = "circle-1";
const CALLER_ID = "caller-1";

function makeDeps(overrides: {
  moment?: ReturnType<typeof makeMoment> | null;
  circle?: ReturnType<typeof makeCircle> | null;
  membershipStatus?: "ACTIVE" | "PENDING" | null;
} = {}) {
  const moment = overrides.moment === undefined ? makeMoment({ id: MOMENT_ID, circleId: CIRCLE_ID }) : overrides.moment;
  const circle = overrides.circle === undefined ? makeCircle({ id: CIRCLE_ID, visibility: "PUBLIC" }) : overrides.circle;

  const momentRepository = createMockMomentRepository({
    findById: vi.fn().mockResolvedValue(moment),
  });
  const circleRepository = createMockCircleRepository({
    findById: vi.fn().mockResolvedValue(circle),
    findMembership:
      overrides.membershipStatus === undefined
        ? vi.fn().mockResolvedValue(null)
        : vi
            .fn()
            .mockResolvedValue(
              overrides.membershipStatus
                ? makeMembership({ userId: CALLER_ID, status: overrides.membershipStatus })
                : null,
            ),
  });
  const registrationRepository = createMockRegistrationRepository();

  return { momentRepository, circleRepository, registrationRepository };
}

describe("getMomentParticipantsPage", () => {
  describe("given the caller is anonymous", () => {
    it("should throw UnauthorizedMomentActionError", async () => {
      await expect(
        getMomentParticipantsPage(
          { momentId: MOMENT_ID, offset: 0, limit: 20, callerUserId: null },
          makeDeps(),
        ),
      ).rejects.toThrow(UnauthorizedMomentActionError);
    });
  });

  describe("given the Moment does not exist", () => {
    it("should throw MomentNotFoundError", async () => {
      const deps = makeDeps({ moment: null });

      await expect(
        getMomentParticipantsPage(
          { momentId: MOMENT_ID, offset: 0, limit: 20, callerUserId: CALLER_ID },
          deps,
        ),
      ).rejects.toThrow(MomentNotFoundError);
    });
  });

  describe("given the Circle does not exist", () => {
    it("should throw CircleNotFoundError", async () => {
      const deps = makeDeps({ circle: null });

      await expect(
        getMomentParticipantsPage(
          { momentId: MOMENT_ID, offset: 0, limit: 20, callerUserId: CALLER_ID },
          deps,
        ),
      ).rejects.toThrow(CircleNotFoundError);
    });
  });

  describe("given a PRIVATE Circle and the caller is not an ACTIVE member", () => {
    it("should throw UnauthorizedMomentActionError", async () => {
      const deps = makeDeps({
        circle: makeCircle({ id: CIRCLE_ID, visibility: "PRIVATE" }),
        membershipStatus: null,
      });

      await expect(
        getMomentParticipantsPage(
          { momentId: MOMENT_ID, offset: 0, limit: 20, callerUserId: CALLER_ID },
          deps,
        ),
      ).rejects.toThrow(UnauthorizedMomentActionError);
    });
  });

  describe("given the caller is authorized", () => {
    it("should pass callerUserId as priorityUserId to the repository", async () => {
      const deps = makeDeps();
      const spy = vi.spyOn(deps.registrationRepository, "findParticipantsPaginated");

      await getMomentParticipantsPage(
        { momentId: MOMENT_ID, offset: 0, limit: 20, callerUserId: CALLER_ID },
        deps,
      );

      expect(spy).toHaveBeenCalledWith(MOMENT_ID, {
        offset: 0,
        limit: 20,
        priorityUserId: CALLER_ID,
      });
    });

    it("should return the page from the repository", async () => {
      const deps = makeDeps();
      deps.registrationRepository.findParticipantsPaginated = vi
        .fn()
        .mockResolvedValue({ participants: [], total: 5, hasMore: true });

      const result = await getMomentParticipantsPage(
        { momentId: MOMENT_ID, offset: 0, limit: 20, callerUserId: CALLER_ID },
        deps,
      );

      expect(result).toEqual({ participants: [], total: 5, hasMore: true });
    });
  });

  describe("given the caller is an active Organizer", () => {
    it("should return participants with email and Stripe identifiers intact", async () => {
      const deps = makeDeps({ membershipStatus: "ACTIVE" }); // rôle HOST par défaut
      deps.registrationRepository.findParticipantsPaginated = vi
        .fn()
        .mockResolvedValue({ participants: [makeParticipant()], total: 1, hasMore: false });

      const result = await getMomentParticipantsPage(
        { momentId: MOMENT_ID, offset: 0, limit: 20, callerUserId: CALLER_ID },
        deps,
      );

      expect(result.participants[0].user.email).toBe("ada@example.com");
      expect(result.participants[0].stripePaymentIntentId).toBe("pi_123");
      expect(result.participants[0].stripeReceiptUrl).toBe("https://stripe.test/receipt/123");
    });
  });

  describe("given the caller is authorized but not an Organizer", () => {
    it("should redact email and Stripe identifiers on a PUBLIC Circle (no membership)", async () => {
      const deps = makeDeps(); // Circle PUBLIC, findMembership → null
      deps.registrationRepository.findParticipantsPaginated = vi
        .fn()
        .mockResolvedValue({ participants: [makeParticipant()], total: 1, hasMore: false });

      const result = await getMomentParticipantsPage(
        { momentId: MOMENT_ID, offset: 0, limit: 20, callerUserId: CALLER_ID },
        deps,
      );

      expect(result.participants[0].user.email).toBe("");
      expect(result.participants[0].stripePaymentIntentId).toBeNull();
      expect(result.participants[0].stripeReceiptUrl).toBeNull();
      // Les champs non sensibles restent intacts (affichage social proof).
      expect(result.participants[0].user.firstName).toBe("Ada");
      expect(result.participants[0].user.id).toBe("user-2");
    });

    it("should redact even for an ACTIVE PLAYER member (organizer role required)", async () => {
      const deps = makeDeps();
      deps.circleRepository.findMembership = vi
        .fn()
        .mockResolvedValue(makeMembership({ userId: CALLER_ID, role: "PLAYER", status: "ACTIVE" }));
      deps.registrationRepository.findParticipantsPaginated = vi
        .fn()
        .mockResolvedValue({ participants: [makeParticipant()], total: 1, hasMore: false });

      const result = await getMomentParticipantsPage(
        { momentId: MOMENT_ID, offset: 0, limit: 20, callerUserId: CALLER_ID },
        deps,
      );

      expect(result.participants[0].user.email).toBe("");
      expect(result.participants[0].stripePaymentIntentId).toBeNull();
    });
  });
});
