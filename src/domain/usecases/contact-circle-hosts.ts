import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { UserRepository } from "@/domain/ports/repositories/user-repository";
import type { EmailService } from "@/domain/ports/services/email-service";
import type { RateLimiter } from "@/domain/ports/services/rate-limiter";
import { isOrganizerRole } from "@/domain/models/circle";
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

export const CONTACT_MESSAGE_MIN_LENGTH = 10;
export const CONTACT_MESSAGE_MAX_LENGTH = 2000;
export const CONTACT_HOSTS_MAX_PER_HOUR = 2;
const CONTACT_HOSTS_WINDOW_MS = 60 * 60 * 1000;

export type ContactCircleHostsInput = {
  senderId: string;
  circleId: string;
  message: string;
  /** Si fourni, restreint le contexte à un événement précis du Circle. */
  momentId?: string;
};

export type ContactCircleHostsDeps = {
  userRepository: UserRepository;
  circleRepository: CircleRepository;
  momentRepository: MomentRepository;
  emailService: EmailService;
  rateLimiter: RateLimiter;
  /** Strings i18n résolus côté app (le domaine reste pur). */
  emailStrings: {
    subject: string;
    heading: string;
    intro: string;
    messageLabel: string;
    replyHint: string;
    viewContextCta: string;
    footer: string;
  };
  appUrl: string;
};

export type ContactCircleHostsResult = {
  recipientsCount: number;
};

export async function contactCircleHosts(
  input: ContactCircleHostsInput,
  deps: ContactCircleHostsDeps
): Promise<ContactCircleHostsResult> {
  const {
    userRepository,
    circleRepository,
    momentRepository,
    emailService,
    rateLimiter,
    emailStrings,
    appUrl,
  } = deps;

  const trimmed = input.message.trim();
  if (trimmed.length < CONTACT_MESSAGE_MIN_LENGTH) {
    throw new ContactMessageTooShortError(CONTACT_MESSAGE_MIN_LENGTH);
  }
  if (trimmed.length > CONTACT_MESSAGE_MAX_LENGTH) {
    throw new ContactMessageTooLongError(CONTACT_MESSAGE_MAX_LENGTH);
  }

  const sender = await userRepository.findById(input.senderId);
  if (!sender) {
    throw new UserNotFoundError(input.senderId);
  }
  if (!sender.email) {
    throw new SenderEmailMissingError(input.senderId);
  }

  const circle = await circleRepository.findById(input.circleId);
  if (!circle) {
    throw new CircleNotFoundError(input.circleId);
  }

  let momentTitle: string | null = null;
  let momentSlug: string | null = null;
  if (input.momentId) {
    const moment = await momentRepository.findById(input.momentId);
    if (!moment) {
      throw new MomentNotFoundError(input.momentId);
    }
    if (moment.circleId !== input.circleId) {
      throw new MomentNotInCircleError(input.momentId, input.circleId);
    }
    momentTitle = moment.title;
    momentSlug = moment.slug;
  }

  const { allowed } = await rateLimiter.checkLimit(
    `contact-hosts:${input.senderId}`,
    CONTACT_HOSTS_MAX_PER_HOUR,
    CONTACT_HOSTS_WINDOW_MS
  );
  if (!allowed) {
    throw new ContactHostsRateLimitedError();
  }

  const organizers = (await circleRepository.findOrganizers(input.circleId)).filter(
    (m) => isOrganizerRole(m.role) && m.status === "ACTIVE" && m.user.email
  );
  if (organizers.length === 0) {
    throw new NoHostsToContactError(input.circleId);
  }

  const senderName = formatSenderName(sender.firstName, sender.lastName, sender.email);
  const contextUrl = momentSlug
    ? `${appUrl}/m/${momentSlug}`
    : `${appUrl}/circles/${circle.slug}`;

  await Promise.all(
    organizers.map((organizer) =>
      emailService.sendHostContactMessage({
        to: organizer.user.email,
        replyTo: sender.email!,
        recipientName: formatSenderName(
          organizer.user.firstName,
          organizer.user.lastName,
          organizer.user.email
        ),
        senderName,
        senderEmail: sender.email!,
        message: trimmed,
        circleName: circle.name,
        momentTitle,
        contextUrl,
        strings: emailStrings,
      })
    )
  );

  return { recipientsCount: organizers.length };
}

function formatSenderName(
  firstName: string | null,
  lastName: string | null,
  email: string
): string {
  const parts = [firstName, lastName].filter((p): p is string => Boolean(p && p.trim()));
  if (parts.length > 0) return parts.join(" ");
  return email.split("@")[0] ?? email;
}
