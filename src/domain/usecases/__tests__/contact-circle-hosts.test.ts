import { describe, it, expect, vi } from "vitest";
import {
  CONTACT_HOSTS_MAX_PER_HOUR,
  CONTACT_MESSAGE_MAX_LENGTH,
  CONTACT_MESSAGE_MIN_LENGTH,
  contactCircleHosts,
} from "@/domain/usecases/contact-circle-hosts";
import {
  CircleNotFoundError,
  ContactHostsRateLimitedError,
  ContactMessageTooLongError,
  ContactMessageTooShortError,
  MomentNotFoundError,
  MomentNotInCircleError,
  NoHostsToContactError,
  SenderEmailMissingError,
  UserNotFoundError,
} from "@/domain/errors";
import type { CircleMemberWithUser } from "@/domain/models/circle";
import {
  createMockCircleRepository,
  makeCircle,
} from "./helpers/mock-circle-repository";
import {
  createMockMomentRepository,
  makeMoment,
} from "./helpers/mock-moment-repository";
import {
  createMockUserRepository,
  makeUser,
} from "./helpers/mock-user-repository";
import { createMockEmailService } from "./helpers/mock-email-service";
import type { RateLimiter } from "@/domain/ports/services/rate-limiter";

const SENDER_ID = "sender-user-1";
const CIRCLE_ID = "circle-1";
const MOMENT_ID = "moment-1";

function makeRateLimiter(allowed = true): RateLimiter {
  return {
    checkLimit: vi.fn().mockResolvedValue({ allowed, remaining: allowed ? 1 : 0 }),
    purgeExpired: vi.fn().mockResolvedValue(0),
  };
}

function makeOrganizer(
  overrides: { userId: string; email?: string } & Partial<
    Omit<CircleMemberWithUser, "userId">
  >
): CircleMemberWithUser {
  const { userId, email, ...rest } = overrides;
  return {
    id: `membership-${userId}`,
    userId,
    circleId: CIRCLE_ID,
    role: "HOST",
    status: "ACTIVE",
    joinedAt: new Date("2026-01-01"),
    user: {
      id: userId,
      firstName: "Marie",
      lastName: "Dupont",
      email: email ?? `${userId}@example.com`,
      image: null,
      publicId: null,
    },
    ...rest,
  };
}

const emailStrings = {
  subject: "subject",
  heading: "heading",
  intro: "intro {senderName}",
  messageLabel: "message",
  replyHint: "reply hint",
  aboutEvent: "About event {momentTitle} in {circleName}",
  aboutCircle: "About community {circleName}",
  footer: "footer",
};

function makeDeps(overrides: {
  organizers?: CircleMemberWithUser[];
  rateLimited?: boolean;
  sender?: ReturnType<typeof makeUser> | null;
  circle?: ReturnType<typeof makeCircle> | null;
  moment?: ReturnType<typeof makeMoment> | null;
} = {}) {
  const sender =
    overrides.sender === undefined
      ? makeUser({ id: SENDER_ID, email: "player@example.com" })
      : overrides.sender;
  const circle =
    overrides.circle === undefined ? makeCircle({ id: CIRCLE_ID }) : overrides.circle;
  const moment =
    overrides.moment === undefined ? null : overrides.moment;

  const userRepository = createMockUserRepository({
    findById: vi.fn().mockResolvedValue(sender),
  });
  const circleRepository = createMockCircleRepository({
    findById: vi.fn().mockResolvedValue(circle),
    findOrganizers: vi.fn().mockResolvedValue(overrides.organizers ?? []),
  });
  const momentRepository = createMockMomentRepository({
    findById: vi.fn().mockResolvedValue(moment),
  });
  const emailService = createMockEmailService();
  const rateLimiter = makeRateLimiter(!overrides.rateLimited);

  return {
    userRepository,
    circleRepository,
    momentRepository,
    emailService,
    rateLimiter,
    emailStrings,
    appUrl: "https://app.example.com",
  };
}

describe("contactCircleHosts", () => {
  describe("given a message shorter than minimum length", () => {
    it("should throw ContactMessageTooShortError", async () => {
      const deps = makeDeps();
      await expect(
        contactCircleHosts(
          { senderId: SENDER_ID, circleId: CIRCLE_ID, message: "hi" },
          deps
        )
      ).rejects.toThrow(ContactMessageTooShortError);
    });
  });

  describe("given a message longer than maximum length", () => {
    it("should throw ContactMessageTooLongError", async () => {
      const deps = makeDeps();
      const message = "a".repeat(CONTACT_MESSAGE_MAX_LENGTH + 1);
      await expect(
        contactCircleHosts(
          { senderId: SENDER_ID, circleId: CIRCLE_ID, message },
          deps
        )
      ).rejects.toThrow(ContactMessageTooLongError);
    });
  });

  describe("given the sender does not exist", () => {
    it("should throw UserNotFoundError", async () => {
      const deps = makeDeps({ sender: null });
      await expect(
        contactCircleHosts(
          { senderId: SENDER_ID, circleId: CIRCLE_ID, message: validMessage() },
          deps
        )
      ).rejects.toThrow(UserNotFoundError);
    });
  });

  describe("given the sender has no email", () => {
    it("should throw SenderEmailMissingError", async () => {
      const deps = makeDeps({
        sender: makeUser({ id: SENDER_ID, email: null as unknown as string }),
      });
      await expect(
        contactCircleHosts(
          { senderId: SENDER_ID, circleId: CIRCLE_ID, message: validMessage() },
          deps
        )
      ).rejects.toThrow(SenderEmailMissingError);
    });
  });

  describe("given the circle does not exist", () => {
    it("should throw CircleNotFoundError", async () => {
      const deps = makeDeps({ circle: null });
      await expect(
        contactCircleHosts(
          { senderId: SENDER_ID, circleId: CIRCLE_ID, message: validMessage() },
          deps
        )
      ).rejects.toThrow(CircleNotFoundError);
    });
  });

  describe("given a momentId that does not exist", () => {
    it("should throw MomentNotFoundError", async () => {
      const deps = makeDeps({ moment: null });
      await expect(
        contactCircleHosts(
          {
            senderId: SENDER_ID,
            circleId: CIRCLE_ID,
            momentId: MOMENT_ID,
            message: validMessage(),
          },
          deps
        )
      ).rejects.toThrow(MomentNotFoundError);
    });
  });

  describe("given a moment that belongs to another circle", () => {
    it("should throw MomentNotInCircleError", async () => {
      const deps = makeDeps({
        moment: makeMoment({ id: MOMENT_ID, circleId: "other-circle" }),
      });
      await expect(
        contactCircleHosts(
          {
            senderId: SENDER_ID,
            circleId: CIRCLE_ID,
            momentId: MOMENT_ID,
            message: validMessage(),
          },
          deps
        )
      ).rejects.toThrow(MomentNotInCircleError);
    });
  });

  describe("given the rate limit is exceeded", () => {
    it("should throw ContactHostsRateLimitedError", async () => {
      const deps = makeDeps({
        rateLimited: true,
        organizers: [makeOrganizer({ userId: "host-1" })],
      });
      await expect(
        contactCircleHosts(
          { senderId: SENDER_ID, circleId: CIRCLE_ID, message: validMessage() },
          deps
        )
      ).rejects.toThrow(ContactHostsRateLimitedError);

      expect(deps.rateLimiter.checkLimit).toHaveBeenCalledWith(
        `contact-hosts:${SENDER_ID}`,
        CONTACT_HOSTS_MAX_PER_HOUR,
        expect.any(Number)
      );
    });
  });

  describe("given the circle has no active organizer", () => {
    it("should throw NoHostsToContactError", async () => {
      const deps = makeDeps({ organizers: [] });
      await expect(
        contactCircleHosts(
          { senderId: SENDER_ID, circleId: CIRCLE_ID, message: validMessage() },
          deps
        )
      ).rejects.toThrow(NoHostsToContactError);
    });
  });

  describe("given the circle has multiple active organizers", () => {
    it("should send one email per organizer with reply-to set to sender", async () => {
      const organizers = [
        makeOrganizer({ userId: "host-1", email: "host-1@example.com" }),
        makeOrganizer({
          userId: "host-2",
          email: "host-2@example.com",
          role: "CO_HOST",
        }),
      ];
      const deps = makeDeps({ organizers });

      const result = await contactCircleHosts(
        { senderId: SENDER_ID, circleId: CIRCLE_ID, message: "  Hello there organisers!  " },
        deps
      );

      expect(result.recipientsCount).toBe(2);
      expect(deps.emailService.sendHostContactMessage).toHaveBeenCalledTimes(2);

      const calls = (deps.emailService.sendHostContactMessage as ReturnType<typeof vi.fn>).mock.calls;
      const tos = calls.map((c) => c[0].to);
      expect(tos).toEqual(
        expect.arrayContaining(["host-1@example.com", "host-2@example.com"])
      );

      for (const [data] of calls) {
        expect(data.replyTo).toBe("player@example.com");
        expect(data.message).toBe("Hello there organisers!");
        expect(data.context).toBe("About community My Circle");
        expect(data.baseUrl).toBe("https://app.example.com");
      }
    });
  });

  describe("given a momentId that belongs to the circle", () => {
    it("should pass the event context string to the template", async () => {
      const organizers = [makeOrganizer({ userId: "host-1" })];
      const deps = makeDeps({
        organizers,
        moment: makeMoment({
          id: MOMENT_ID,
          circleId: CIRCLE_ID,
          title: "Soirée React",
          slug: "soiree-react",
        }),
      });

      await contactCircleHosts(
        {
          senderId: SENDER_ID,
          circleId: CIRCLE_ID,
          momentId: MOMENT_ID,
          message: validMessage(),
        },
        deps
      );

      const [[data]] = (deps.emailService.sendHostContactMessage as ReturnType<typeof vi.fn>).mock.calls;
      expect(data.context).toBe("About event Soirée React in My Circle");
    });
  });

  describe("given an organizer with PENDING status", () => {
    it("should be excluded from recipients", async () => {
      const organizers = [
        makeOrganizer({ userId: "host-1", email: "active@example.com" }),
        makeOrganizer({ userId: "host-2", email: "pending@example.com", status: "PENDING" }),
      ];
      const deps = makeDeps({ organizers });

      const result = await contactCircleHosts(
        { senderId: SENDER_ID, circleId: CIRCLE_ID, message: validMessage() },
        deps
      );

      expect(result.recipientsCount).toBe(1);
      const [[data]] = (deps.emailService.sendHostContactMessage as ReturnType<typeof vi.fn>).mock.calls;
      expect(data.to).toBe("active@example.com");
    });
  });
});

function validMessage(): string {
  return "a".repeat(CONTACT_MESSAGE_MIN_LENGTH);
}
