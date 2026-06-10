import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
import type { UserRepository } from "@/domain/ports/repositories/user-repository";
import type { EmailService } from "@/domain/ports/services/email-service";
import type {
  HostMessageSegment,
  RegistrationWithUser,
} from "@/domain/models/registration";
import { isActiveOrganizer } from "@/domain/models/circle";
import { getDisplayName } from "@/lib/display-name";
import {
  HostMessageBodyEmptyError,
  HostMessageNoRecipientsError,
  HostMessageNotAllowedOnDraftError,
  HostMessageSubjectInvalidError,
  MomentNotFoundError,
  SenderEmailMissingError,
  UnauthorizedMomentActionError,
  UserNotFoundError,
} from "@/domain/errors";

export const HOST_MESSAGE_SUBJECT_MAX_LENGTH = 150;

export type { HostMessageSegment };

export type SendMomentHostMessageInput = {
  momentId: string;
  senderId: string;
  segment: HostMessageSegment;
  /** Objet saisi par l'Organisateur. */
  subject: string;
  /** Corps HTML déjà sanitizé en couche action (string opaque pour le domaine). */
  bodyHtml: string;
  /** Admin en host mode : court-circuite la vérification d'organisateur. */
  skipAuthorization?: boolean;
};

export type SendMomentHostMessageDeps = {
  momentRepository: MomentRepository;
  circleRepository: CircleRepository;
  registrationRepository: RegistrationRepository;
  userRepository: UserRepository;
  emailService: EmailService;
  /** Strings i18n résolus côté app (le domaine reste pur). */
  emailStrings: {
    greeting: string;
    greetingFallback: string;
    preheader: string;
    dateLabel: string;
    locationLabel: string;
    ctaLabel: string;
    footer: string;
  };
  momentDate: string;
  momentDateMonth: string;
  momentDateDay: string;
  momentLocation: string | null;
  appUrl: string;
  /** Remontée des erreurs d'envoi (fire-and-forget) — ex: Sentry côté app. */
  onEmailError?: (error: unknown) => void;
};

export type SendMomentHostMessageResult = {
  recipientCount: number;
};

function matchesSegment(
  registration: RegistrationWithUser,
  segment: HostMessageSegment
): boolean {
  if (segment === "ALL") return true;
  return registration.status === segment;
}

export async function sendMomentHostMessage(
  input: SendMomentHostMessageInput,
  deps: SendMomentHostMessageDeps
): Promise<SendMomentHostMessageResult> {
  const {
    momentRepository,
    circleRepository,
    registrationRepository,
    userRepository,
    emailService,
  } = deps;

  const subject = input.subject.trim();
  if (subject.length === 0 || subject.length > HOST_MESSAGE_SUBJECT_MAX_LENGTH) {
    throw new HostMessageSubjectInvalidError(HOST_MESSAGE_SUBJECT_MAX_LENGTH);
  }
  if (input.bodyHtml.trim().length === 0) {
    throw new HostMessageBodyEmptyError();
  }

  const moment = await momentRepository.findById(input.momentId);
  if (!moment) throw new MomentNotFoundError(input.momentId);
  if (moment.status === "DRAFT") {
    throw new HostMessageNotAllowedOnDraftError(input.momentId);
  }

  if (!input.skipAuthorization) {
    const membership = await circleRepository.findMembership(
      moment.circleId,
      input.senderId
    );
    if (!isActiveOrganizer(membership)) {
      throw new UnauthorizedMomentActionError();
    }
  }

  const sender = await userRepository.findById(input.senderId);
  if (!sender) throw new UserNotFoundError(input.senderId);
  if (!sender.email) throw new SenderEmailMissingError(input.senderId);

  const registrations = await registrationRepository.findActiveWithUserByMomentId(
    input.momentId
  );
  const recipients = registrations.filter(
    (r) => matchesSegment(r, input.segment) && r.userId !== input.senderId
  );
  if (recipients.length === 0) {
    throw new HostMessageNoRecipientsError(input.momentId, input.segment);
  }

  // Mark avant l'envoi — anti race condition (écrase le timestamp à chaque envoi)
  await momentRepository.markHostMessageSent(input.momentId);

  // Fire-and-forget : l'envoi batch ne bloque pas le retour du usecase.
  emailService
    .sendMomentHostMessages({
      recipients: recipients.map((r) => ({
        to: r.user.email,
        firstName: r.user.firstName,
      })),
      replyTo: sender.email,
      hostName: getDisplayName(sender.firstName, sender.lastName, sender.email),
      hostAvatarUrl: sender.image ?? null,
      subject,
      bodyHtml: input.bodyHtml,
      strings: deps.emailStrings,
      momentTitle: moment.title,
      momentDate: deps.momentDate,
      momentDateMonth: deps.momentDateMonth,
      momentDateDay: deps.momentDateDay,
      momentLocation: deps.momentLocation,
      momentSlug: moment.slug,
      appUrl: deps.appUrl,
    })
    .catch((err) => deps.onEmailError?.(err));

  return { recipientCount: recipients.length };
}
