import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
import type { UserRepository } from "@/domain/ports/repositories/user-repository";
import type { EmailService } from "@/domain/ports/services/email-service";
import type { Moment } from "@/domain/models/moment";
import {
  HOST_MESSAGE_BODY_MAX_TEXT_LENGTH,
  HOST_MESSAGE_SUBJECT_MAX_LENGTH,
  type HostMessageSegment,
  type RegistrationWithUser,
} from "@/domain/models/registration";
import { isActiveOrganizer } from "@/domain/models/circle";
import { getDisplayName } from "@/lib/display-name";
import { LOCALE_GROUP_PAUSE_MS, runEachGroup } from "@/lib/run-each-group";
import {
  HostMessageBodyEmptyError,
  HostMessageBodyTooLongError,
  HostMessageNoRecipientsError,
  HostMessageNotAllowedOnDraftError,
  HostMessageSubjectInvalidError,
  MomentNotFoundError,
  SenderEmailMissingError,
  UnauthorizedMomentActionError,
  UserNotFoundError,
} from "@/domain/errors";

export type { HostMessageSegment };

export type SendMomentHostMessageInput = {
  momentId: string;
  senderId: string;
  segment: HostMessageSegment;
  /** Objet saisi par l'Organisateur. */
  subject: string;
  /** Corps HTML déjà sanitizé en couche action (string opaque pour le domaine). */
  bodyHtml: string;
  /** Longueur du texte seul du corps (balises exclues), calculée par l'action. */
  bodyTextLength: number;
  /** Admin en host mode : court-circuite la vérification d'organisateur. */
  skipAuthorization?: boolean;
};

/** Textes et formatage d'une langue d'email, résolus côté app (le domaine reste pur). */
export type HostMessageEmailLocalization = {
  /** Strings i18n de la langue du groupe. */
  emailStrings: {
    preheader: string;
    dateLabel: string;
    locationLabel: string;
    ctaLabel: string;
    footer: string;
  };
  /**
   * Construit les chaînes de date/lieu de l'email à partir du Moment chargé.
   * Résolu côté app : i18n et date-fns restent hors du domaine.
   */
  buildEmailContext: (moment: Moment) => {
    momentDate: string;
    momentDateMonth: string;
    momentDateDay: string;
    momentLocation: string | null;
  };
};

export type SendMomentHostMessageDeps = {
  momentRepository: MomentRepository;
  circleRepository: CircleRepository;
  registrationRepository: RegistrationRepository;
  userRepository: UserRepository;
  emailService: EmailService;
  /**
   * Regroupe les destinataires par langue d'email : chaque groupe reçoit les
   * textes de sa langue. Un destinataire absent de tous les groupes ne reçoit rien.
   */
  localizeRecipients: (
    recipientUserIds: string[]
  ) => Promise<Array<{ userIds: string[] } & HostMessageEmailLocalization>>;
  appUrl: string;
};

export type SendMomentHostMessageResult = {
  /** Destinataires réellement atteints (lots en échec exclus). */
  recipientCount: number;
  /**
   * Erreurs des lots de langue en échec. Le usecase ne lève pas sur un échec
   * d'envoi : l'app applique la règle commune (signaler, échouer si rien n'est
   * parti), le domaine ne logge pas.
   */
  failures: unknown[];
};

function matchesSegment(
  registration: RegistrationWithUser,
  segment: HostMessageSegment
): boolean {
  if (segment === "ALL") return true;
  return registration.status === segment;
}

/**
 * Interpole des placeholders {key} dans un template i18n. La valeur est passée
 * en fonction pour neutraliser les motifs spéciaux de String.replace ($&, $'…)
 * présents dans une donnée utilisateur.
 */
function fillPlaceholders(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replace(`{${key}}`, () => value),
    template
  );
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
  if (input.bodyTextLength <= 0 || input.bodyHtml.trim().length === 0) {
    throw new HostMessageBodyEmptyError();
  }
  if (input.bodyTextLength > HOST_MESSAGE_BODY_MAX_TEXT_LENGTH) {
    throw new HostMessageBodyTooLongError(HOST_MESSAGE_BODY_MAX_TEXT_LENGTH);
  }

  const moment = await momentRepository.findById(input.momentId);
  if (!moment) throw new MomentNotFoundError(input.momentId);
  if (moment.status === "DRAFT") {
    throw new HostMessageNotAllowedOnDraftError(input.momentId);
  }

  // Trois lectures indépendantes — parallélisées, validées dans l'ordre métier.
  const [membership, sender, registrations] = await Promise.all([
    input.skipAuthorization
      ? Promise.resolve(null)
      : circleRepository.findMembership(moment.circleId, input.senderId),
    userRepository.findById(input.senderId),
    registrationRepository.findActiveWithUserByMomentId(input.momentId),
  ]);

  if (!input.skipAuthorization && !isActiveOrganizer(membership)) {
    throw new UnauthorizedMomentActionError();
  }

  if (!sender) throw new UserNotFoundError(input.senderId);
  if (!sender.email) throw new SenderEmailMissingError(input.senderId);
  // L'expéditeur inscrit reçoit aussi le message : copie de contrôle pour
  // vérifier le rendu et confirmer que l'envoi est bien parti.
  const recipients = registrations.filter((r) => matchesSegment(r, input.segment));
  if (recipients.length === 0) {
    throw new HostMessageNoRecipientsError(input.momentId, input.segment);
  }

  const localeGroups = await deps.localizeRecipients(recipients.map((r) => r.userId));

  // Mark avant l'envoi — anti race condition (écrase le timestamp à chaque envoi)
  await momentRepository.markHostMessageSent(input.momentId);

  const hostName = getDisplayName(sender.firstName, sender.lastName, sender.email);
  const replyTo = sender.email;

  // Un lot par langue. Envoi attendu avant le retour (pattern contact-circle-hosts) :
  // une promesse flottante serait larguée au gel de l'instance Vercel après la
  // réponse, et le succès retourné à l'Organisateur ne serait pas garanti.
  // Chaque lot part indépendamment : un échec n'empêche pas les suivants, et
  // l'action n'échoue que si rien n'est parti (sinon l'Organisateur renverrait
  // le message et les lots déjà partis le recevraient deux fois). Lots espacés
  // de 500 ms pour éviter la rafale d'appels.
  const lots = localeGroups
    .map((group) => {
      const groupUserIds = new Set(group.userIds);
      return {
        ...group,
        recipients: recipients.filter((r) => groupUserIds.has(r.userId)),
      };
    })
    .filter((lot) => lot.recipients.length > 0);

  const { succeeded, errors } = await runEachGroup(lots, async (lot) => {
    const emailContext = lot.buildEmailContext(moment);
    await emailService.sendMomentHostMessages({
      recipients: lot.recipients.map((r) => ({
        to: r.user.email,
        firstName: r.user.firstName,
      })),
      replyTo,
      hostName,
      hostFirstName: sender.firstName,
      hostAvatarUrl: sender.image ?? null,
      subject,
      bodyHtml: input.bodyHtml,
      strings: {
        ...lot.emailStrings,
        preheader: fillPlaceholders(lot.emailStrings.preheader, {
          hostName,
          momentTitle: moment.title,
        }),
        footer: fillPlaceholders(lot.emailStrings.footer, { momentTitle: moment.title }),
      },
      momentTitle: moment.title,
      momentDate: emailContext.momentDate,
      momentDateMonth: emailContext.momentDateMonth,
      momentDateDay: emailContext.momentDateDay,
      momentLocation: emailContext.momentLocation,
      momentSlug: moment.slug,
      appUrl: deps.appUrl,
    });
  }, { pauseBetweenMs: LOCALE_GROUP_PAUSE_MS });

  return {
    recipientCount: succeeded.reduce((sum, lot) => sum + lot.recipients.length, 0),
    failures: errors,
  };
}
