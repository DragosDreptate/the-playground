import { describe, expect, it, vi } from "vitest";
import {
  sendMomentHostMessage,
  type HostMessageEmailLocalization,
  type SendMomentHostMessageDeps,
  type SendMomentHostMessageInput,
} from "@/domain/usecases/send-moment-host-message";
import {
  HostMessageBodyEmptyError,
  HostMessageBodyTooLongError,
  HostMessageNoRecipientsError,
  HostMessageNotAllowedOnDraftError,
  HostMessageSubjectInvalidError,
  MomentNotFoundError,
  UnauthorizedMomentActionError,
} from "@/domain/errors";
import {
  HOST_MESSAGE_BODY_MAX_TEXT_LENGTH,
  HOST_MESSAGE_SUBJECT_MAX_LENGTH,
  type RegistrationWithUser,
  type RegistrationStatus,
} from "@/domain/models/registration";
import { createMockMomentRepository, makeMoment } from "./helpers/mock-moment-repository";
import { createMockCircleRepository, makeMembership } from "./helpers/mock-circle-repository";
import {
  createMockRegistrationRepository,
  makeRegistration,
} from "./helpers/mock-registration-repository";
import { createMockUserRepository, makeUser } from "./helpers/mock-user-repository";
import { createMockEmailService } from "./helpers/mock-email-service";

const HOST_ID = "host-1";

function makeRegistrationWithUser(
  userId: string,
  status: RegistrationStatus,
  firstName: string | null = "Alice"
): RegistrationWithUser {
  return {
    ...makeRegistration({ id: `reg-${userId}`, userId, status }),
    user: {
      id: userId,
      firstName,
      lastName: "Doe",
      email: `${userId}@example.com`,
      image: null,
      publicId: null,
    },
  };
}

function makeInput(
  overrides: Partial<SendMomentHostMessageInput> = {}
): SendMomentHostMessageInput {
  return {
    momentId: "moment-1",
    senderId: HOST_ID,
    segment: "REGISTERED",
    subject: "Changement de salle",
    bodyHtml: "<p>Nous changeons de salle.</p>",
    bodyTextLength: 25,
    ...overrides,
  };
}

const frLocalization: HostMessageEmailLocalization = {
  emailStrings: {
    preheader: "Message",
    dateLabel: "Date",
    locationLabel: "Lieu",
    ctaLabel: "Voir l'événement",
    footer: "Vous recevez cet email car vous êtes inscrit.",
  },
  buildEmailContext: () => ({
    momentDate: "vendredi 21 mars 2026, 19:00",
    momentDateMonth: "MAR",
    momentDateDay: "21",
    momentLocation: "Cafe Central, Paris",
  }),
};

const enLocalization: HostMessageEmailLocalization = {
  emailStrings: {
    preheader: "Message",
    dateLabel: "Date",
    locationLabel: "Location",
    ctaLabel: "View Event",
    footer: "You're receiving this email because you're registered.",
  },
  buildEmailContext: () => ({
    momentDate: "Friday 21 March 2026, 19:00",
    momentDateMonth: "MAR",
    momentDateDay: "21",
    momentLocation: "Cafe Central, Paris",
  }),
};

function makeDeps(
  overrides: Partial<SendMomentHostMessageDeps> = {}
): SendMomentHostMessageDeps {
  return {
    momentRepository: createMockMomentRepository({
      findById: vi.fn().mockResolvedValue(makeMoment({ id: "moment-1" })),
    }),
    circleRepository: createMockCircleRepository({
      findMembership: vi
        .fn()
        .mockResolvedValue(makeMembership({ userId: HOST_ID, role: "HOST", status: "ACTIVE" })),
    }),
    registrationRepository: createMockRegistrationRepository({
      findActiveWithUserByMomentId: vi
        .fn()
        .mockResolvedValue([
          makeRegistrationWithUser("user-2", "REGISTERED"),
          makeRegistrationWithUser("user-3", "WAITLISTED"),
        ]),
    }),
    userRepository: createMockUserRepository({
      findById: vi
        .fn()
        .mockResolvedValue(makeUser({ id: HOST_ID, email: "host@example.com" })),
    }),
    emailService: createMockEmailService(),
    localizeRecipients: async (userIds) => [{ userIds, ...frLocalization }],
    appUrl: "https://the-playground.fr",
    ...overrides,
  };
}

describe("SendMomentHostMessage", () => {
  describe("given recipients with different email languages", () => {
    it("should send one batch per language, each with its own strings", async () => {
      const deps = makeDeps({
        localizeRecipients: async () => [
          { userIds: ["user-2"], ...frLocalization },
          { userIds: ["user-3"], ...enLocalization },
        ],
      });

      const result = await sendMomentHostMessage(makeInput({ segment: "ALL" }), deps);

      expect(result.recipientCount).toBe(2);
      const calls = vi.mocked(deps.emailService.sendMomentHostMessages).mock.calls;
      expect(calls).toHaveLength(2);
      expect(calls[0][0].recipients.map((r) => r.to)).toEqual(["user-2@example.com"]);
      expect(calls[0][0].strings.locationLabel).toBe("Lieu");
      expect(calls[1][0].recipients.map((r) => r.to)).toEqual(["user-3@example.com"]);
      expect(calls[1][0].strings.locationLabel).toBe("Location");
      expect(calls[1][0].momentDate).toBe("Friday 21 March 2026, 19:00");
    });

    it("should still send the other batches when one fails, and count only delivered recipients", async () => {
      const deps = makeDeps({
        localizeRecipients: async () => [
          { userIds: ["user-2"], ...frLocalization },
          { userIds: ["user-3"], ...enLocalization },
        ],
      });
      vi.mocked(deps.emailService.sendMomentHostMessages)
        .mockRejectedValueOnce(new Error("Resend down"))
        .mockResolvedValueOnce(undefined);

      const result = await sendMomentHostMessage(makeInput({ segment: "ALL" }), deps);

      expect(deps.emailService.sendMomentHostMessages).toHaveBeenCalledTimes(2);
      expect(result.recipientCount).toBe(1);
      expect(result.failures).toHaveLength(1);
    });

    it("should not double-send when preparing a later batch fails after an earlier one left", async () => {
      const deps = makeDeps({
        localizeRecipients: async () => [
          { userIds: ["user-2"], ...frLocalization },
          {
            userIds: ["user-3"],
            ...enLocalization,
            buildEmailContext: () => {
              throw new RangeError("Invalid time value");
            },
          },
        ],
      });

      const result = await sendMomentHostMessage(makeInput({ segment: "ALL" }), deps);

      expect(deps.emailService.sendMomentHostMessages).toHaveBeenCalledTimes(1);
      expect(result.recipientCount).toBe(1);
      expect(result.failures).toHaveLength(1);
    });

    it("should report zero recipients and every failure when all batches fail", async () => {
      const deps = makeDeps({
        localizeRecipients: async () => [
          { userIds: ["user-2"], ...frLocalization },
          { userIds: ["user-3"], ...enLocalization },
        ],
      });
      vi.mocked(deps.emailService.sendMomentHostMessages)
        .mockRejectedValueOnce(new Error("FR down"))
        .mockRejectedValueOnce(new Error("EN down"));

      const result = await sendMomentHostMessage(makeInput({ segment: "ALL" }), deps);

      expect(result.recipientCount).toBe(0);
      expect(result.failures.map((e) => (e as Error).message)).toEqual(["FR down", "EN down"]);
    });
  });

  describe("given a Host of the Circle", () => {
    it("should send the message to the REGISTERED segment and return the recipient count", async () => {
      const deps = makeDeps();

      const result = await sendMomentHostMessage(makeInput(), deps);

      expect(result.recipientCount).toBe(1);
      expect(deps.emailService.sendMomentHostMessages).toHaveBeenCalledWith(
        expect.objectContaining({
          recipients: [{ to: "user-2@example.com", firstName: "Alice" }],
          replyTo: "host@example.com",
          subject: "Changement de salle",
          bodyHtml: "<p>Nous changeons de salle.</p>",
        })
      );
    });

    it("should mark the Moment host message timestamp before sending", async () => {
      const calls: string[] = [];
      const deps = makeDeps();
      vi.mocked(deps.momentRepository.markHostMessageSent).mockImplementation(async () => {
        calls.push("mark");
      });
      vi.mocked(deps.emailService.sendMomentHostMessages).mockImplementation(async () => {
        calls.push("send");
      });

      await sendMomentHostMessage(makeInput(), deps);

      expect(calls).toEqual(["mark", "send"]);
    });

    it("should NOT filter recipients on notification preferences (transactional message)", async () => {
      // Le contrat : le usecase n'a aucune dépendance vers les préférences de
      // notification — tous les inscrits du segment reçoivent le message.
      const deps = makeDeps();

      const result = await sendMomentHostMessage(makeInput({ segment: "ALL" }), deps);

      expect(result.recipientCount).toBe(2);
    });

    describe.each([
      ["REGISTERED" as const, ["user-2@example.com"]],
      ["WAITLISTED" as const, ["user-3@example.com"]],
      ["ALL" as const, ["user-2@example.com", "user-3@example.com"]],
    ])("when targeting the %s segment", (segment, expectedEmails) => {
      it(`should send only to ${expectedEmails.length} matching registration(s)`, async () => {
        const deps = makeDeps();

        await sendMomentHostMessage(makeInput({ segment }), deps);

        const payload = vi.mocked(deps.emailService.sendMomentHostMessages).mock.calls[0][0];
        expect(payload.recipients.map((r) => r.to)).toEqual(expectedEmails);
      });
    });

    it("should include the registered sender in recipients (copie de contrôle)", async () => {
      const deps = makeDeps({
        registrationRepository: createMockRegistrationRepository({
          findActiveWithUserByMomentId: vi
            .fn()
            .mockResolvedValue([
              makeRegistrationWithUser(HOST_ID, "REGISTERED"),
              makeRegistrationWithUser("user-2", "REGISTERED"),
            ]),
        }),
      });

      const result = await sendMomentHostMessage(makeInput(), deps);

      expect(result.recipientCount).toBe(2);
      const payload = vi.mocked(deps.emailService.sendMomentHostMessages).mock.calls[0][0];
      expect(payload.recipients.map((r) => r.to)).toEqual([
        `${HOST_ID}@example.com`,
        "user-2@example.com",
      ]);
    });

    describe.each([["PUBLISHED" as const], ["PAST" as const], ["CANCELLED" as const]])(
      "when the Moment status is %s",
      (status) => {
        it("should allow sending the message", async () => {
          const deps = makeDeps({
            momentRepository: createMockMomentRepository({
              findById: vi.fn().mockResolvedValue(makeMoment({ id: "moment-1", status })),
            }),
          });

          const result = await sendMomentHostMessage(makeInput(), deps);

          expect(result.recipientCount).toBe(1);
        });
      }
    );
  });

  describe("given an active Co-Host of the Circle", () => {
    it("should allow sending the message", async () => {
      const deps = makeDeps({
        circleRepository: createMockCircleRepository({
          findMembership: vi
            .fn()
            .mockResolvedValue(
              makeMembership({ userId: HOST_ID, role: "CO_HOST", status: "ACTIVE" })
            ),
        }),
      });

      const result = await sendMomentHostMessage(makeInput(), deps);

      expect(result.recipientCount).toBe(1);
    });
  });

  describe("given a user who is not an active organizer", () => {
    it.each([
      ["a Player", makeMembership({ role: "PLAYER", status: "ACTIVE" })],
      ["an inactive Co-Host", makeMembership({ role: "CO_HOST", status: "PENDING" })],
      ["a non-member", null],
    ])("should reject %s with UnauthorizedMomentActionError", async (_label, membership) => {
      const deps = makeDeps({
        circleRepository: createMockCircleRepository({
          findMembership: vi.fn().mockResolvedValue(membership),
        }),
      });

      await expect(sendMomentHostMessage(makeInput(), deps)).rejects.toThrow(
        UnauthorizedMomentActionError
      );
      expect(deps.emailService.sendMomentHostMessages).not.toHaveBeenCalled();
      expect(deps.momentRepository.markHostMessageSent).not.toHaveBeenCalled();
    });

    it("should allow an admin in host mode via skipAuthorization", async () => {
      const deps = makeDeps({
        circleRepository: createMockCircleRepository({
          findMembership: vi.fn().mockResolvedValue(null),
        }),
      });

      const result = await sendMomentHostMessage(
        makeInput({ skipAuthorization: true }),
        deps
      );

      expect(result.recipientCount).toBe(1);
    });
  });

  describe("given an invalid context", () => {
    it("should throw MomentNotFoundError when the Moment does not exist", async () => {
      const deps = makeDeps({
        momentRepository: createMockMomentRepository({
          findById: vi.fn().mockResolvedValue(null),
        }),
      });

      await expect(sendMomentHostMessage(makeInput(), deps)).rejects.toThrow(
        MomentNotFoundError
      );
    });

    it("should throw HostMessageNotAllowedOnDraftError on a DRAFT Moment", async () => {
      const deps = makeDeps({
        momentRepository: createMockMomentRepository({
          findById: vi.fn().mockResolvedValue(makeMoment({ id: "moment-1", status: "DRAFT" })),
        }),
      });

      await expect(sendMomentHostMessage(makeInput(), deps)).rejects.toThrow(
        HostMessageNotAllowedOnDraftError
      );
    });

    it("should throw HostMessageNoRecipientsError when the segment is empty", async () => {
      const deps = makeDeps({
        registrationRepository: createMockRegistrationRepository({
          findActiveWithUserByMomentId: vi.fn().mockResolvedValue([]),
        }),
      });

      await expect(sendMomentHostMessage(makeInput(), deps)).rejects.toThrow(
        HostMessageNoRecipientsError
      );
      expect(deps.momentRepository.markHostMessageSent).not.toHaveBeenCalled();
    });

    it.each([
      ["an empty subject", ""],
      ["a blank subject", "   "],
      ["a subject above the max length", "x".repeat(HOST_MESSAGE_SUBJECT_MAX_LENGTH + 1)],
    ])("should throw HostMessageSubjectInvalidError for %s", async (_label, subject) => {
      const deps = makeDeps();

      await expect(sendMomentHostMessage(makeInput({ subject }), deps)).rejects.toThrow(
        HostMessageSubjectInvalidError
      );
    });

    it("should throw HostMessageBodyEmptyError for an empty body", async () => {
      const deps = makeDeps();

      await expect(
        sendMomentHostMessage(makeInput({ bodyHtml: "<p></p>", bodyTextLength: 0 }), deps)
      ).rejects.toThrow(HostMessageBodyEmptyError);
    });

    it("should throw HostMessageBodyTooLongError above the max text length", async () => {
      const deps = makeDeps();

      await expect(
        sendMomentHostMessage(
          makeInput({ bodyTextLength: HOST_MESSAGE_BODY_MAX_TEXT_LENGTH + 1 }),
          deps
        )
      ).rejects.toThrow(HostMessageBodyTooLongError);
    });
  });

  describe("given the email batch fails", () => {
    it("should never report a false success: zero recipients and the failure returned", async () => {
      const deps = makeDeps({
        emailService: createMockEmailService({
          sendMomentHostMessages: vi.fn().mockRejectedValue(new Error("resend down")),
        }),
      });

      const result = await sendMomentHostMessage(makeInput(), deps);

      // L'action transforme « rien n'est parti » en erreur (handleLocaleGroupFailures).
      expect(result.recipientCount).toBe(0);
      expect(result.failures).toHaveLength(1);
    });
  });
});
