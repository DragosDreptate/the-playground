import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { UserRepository } from "@/domain/ports/repositories/user-repository";
import type { EmailService } from "@/domain/ports/services/email-service";
import type { RateLimiter } from "@/domain/ports/services/rate-limiter";
import { isOrganizerRole } from "@/domain/models/circle";
import { getDisplayName } from "@/lib/display-name";
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
  /**
   * Strings i18n résolus côté app (le domaine reste pur).
   * `aboutEvent` et `aboutCircle` sont des templates avec placeholders
   * `{momentTitle}` et `{circleName}` interpolés ici.
   */
  emailStrings: {
    subject: string;
    heading: string;
    intro: string;
    messageLabel: string;
    replyHint: string;
    aboutEvent: string;
    aboutCircle: string;
    footer: string;
  };
  /** URL de base utilisée par le template pour charger le logo. */
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

  const [sender, circle, moment, organizers, rateLimit] = await Promise.all([
    userRepository.findById(input.senderId),
    circleRepository.findById(input.circleId),
    input.momentId
      ? momentRepository.findById(input.momentId)
      : Promise.resolve(null),
    circleRepository.findOrganizers(input.circleId),
    rateLimiter.checkLimit(
      `contact-hosts:${input.senderId}`,
      CONTACT_HOSTS_MAX_PER_HOUR,
      CONTACT_HOSTS_WINDOW_MS
    ),
  ]);

  if (!sender) throw new UserNotFoundError(input.senderId);
  if (!sender.email) throw new SenderEmailMissingError(input.senderId);
  if (!circle) throw new CircleNotFoundError(input.circleId);
  if (input.momentId && !moment) throw new MomentNotFoundError(input.momentId);
  if (moment && moment.circleId !== input.circleId) {
    throw new MomentNotInCircleError(input.momentId!, input.circleId);
  }
  if (!rateLimit.allowed) throw new ContactHostsRateLimitedError();

  const activeHosts = organizers.filter(
    (m) => isOrganizerRole(m.role) && m.status === "ACTIVE" && m.user.email
  );
  if (activeHosts.length === 0) {
    throw new NoHostsToContactError(input.circleId);
  }

  const senderName = getDisplayName(sender.firstName, sender.lastName, sender.email);
  const context = moment
    ? emailStrings.aboutEvent
        .replace("{momentTitle}", moment.title)
        .replace("{circleName}", circle.name)
    : emailStrings.aboutCircle.replace("{circleName}", circle.name);

  const results = await Promise.allSettled(
    activeHosts.map((organizer) =>
      emailService.sendHostContactMessage({
        to: organizer.user.email,
        replyTo: sender.email!,
        recipientName: getDisplayName(
          organizer.user.firstName,
          organizer.user.lastName,
          organizer.user.email
        ),
        senderName,
        senderEmail: sender.email!,
        message: trimmed,
        context,
        baseUrl: appUrl,
        strings: emailStrings,
      })
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  if (sent === 0) throw new NoHostsToContactError(input.circleId);

  return { recipientsCount: sent };
}
