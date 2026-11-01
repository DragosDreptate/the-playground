import type { ReactElement } from "react";
import { render } from "@react-email/components";
import { getTranslations } from "next-intl/server";
import { RegistrationConfirmationEmail } from "@/infrastructure/services/email/templates/registration-confirmation";
import { WaitlistPromotionEmail } from "@/infrastructure/services/email/templates/waitlist-promotion";
import { HostNewRegistrationEmail } from "@/infrastructure/services/email/templates/host-new-registration";
import { HostNewCircleMemberEmail } from "@/infrastructure/services/email/templates/host-new-circle-member";
import { HostMomentCreatedEmail } from "@/infrastructure/services/email/templates/host-moment-created";
import { NewCommentEmail } from "@/infrastructure/services/email/templates/new-comment";
import { HostContactMessageEmail } from "@/infrastructure/services/email/templates/host-contact-message";
import { MomentUpdateEmail } from "@/infrastructure/services/email/templates/moment-update";
import { MomentCancelledEmail } from "@/infrastructure/services/email/templates/moment-cancelled";
import { NewMomentNotificationEmail } from "@/infrastructure/services/email/templates/new-moment-notification";
import { MomentHostMessageEmail } from "@/infrastructure/services/email/templates/moment-host-message";
import { CircleInvitationEmail } from "@/infrastructure/services/email/templates/circle-invitation";
import { ApprovalNotificationEmail } from "@/infrastructure/services/email/templates/approval-notification";
import { CoHostPromotedEmail } from "@/infrastructure/services/email/templates/co-host-promoted";
import { CoHostDemotedEmail } from "@/infrastructure/services/email/templates/co-host-demoted";
import { AdminEntityCreatedEmail } from "@/infrastructure/services/email/templates/admin-entity-created";
import { AdminMomentUpdatedEmail } from "@/infrastructure/services/email/templates/admin-moment-updated";
import { AdminNewUserEmail } from "@/infrastructure/services/email/templates/admin-new-user";
import { AdminCommentPendingEmail } from "@/infrastructure/services/email/templates/admin-comment-pending";
import { MagicLinkEmail } from "@/infrastructure/services/email/templates/magic-link";
import { RegistrationReminderEmail } from "@/infrastructure/services/email/templates/registration-reminder";
import { RegistrationRemovedByHostEmail } from "@/infrastructure/services/email/templates/registration-removed-by-host";
import { CancellationConfirmationEmail } from "@/infrastructure/services/email/templates/cancellation-confirmation";
import { HostCancellationEmail } from "@/infrastructure/services/email/templates/host-cancellation";
import { MemberRemovedFromCircleEmail } from "@/infrastructure/services/email/templates/member-removed-from-circle";
import { OnboardingWelcomeEmail } from "@/infrastructure/services/email/templates/onboarding-welcome";
import { getOnboardingWelcomeContent } from "@/content/emails/onboarding-welcome.content";
import { buildMomentEmailContext } from "@/lib/email/format-moment-email";
import { formatPrice } from "@/lib/format-price";
import type { EmailTranslations } from "@/lib/email/email-locale";
import {
  EmailPreviewClient,
  type EmailGroupId,
  type EmailPreview,
  type PreviewLocale,
} from "./email-preview-client";

/**
 * Labo d'emails : aperçu de TOUS les emails envoyés par la plateforme, en FR et
 * en EN. Les textes viennent des vrais fichiers de traduction (messages/*.json),
 * avec les mêmes clés que le code d'envoi, et les dates/lieux du même module
 * (`buildMomentEmailContext`) : l'aperçu montre ce qui part réellement.
 * Seules les données d'exemple (noms, événement) sont fixées ici.
 */

const BASE_URL = "https://the-playground.fr";
// URL de l'app pour que les aperçus chargent le logo local en dev.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// --- Données d'exemple (contenu saisi par les utilisateurs : non traduit) ---
const PLAYER = "Alice Martin";
const HOST = "Bob Dupont";
const COMMENTER = "Charlie Leroy";
const MOMENT_TITLE = "Soirée JS & Pizza";
const MOMENT_SLUG = "soiree-js-pizza";
const CIRCLE_NAME = "Paris Creative Tech";
const CIRCLE_SLUG = "paris-creative-tech";
const CIRCLE_DESCRIPTION =
  "Une communauté pour les développeurs, designers et product managers parisiens passionnés par les nouvelles technologies. On se retrouve chaque mois pour des talks, workshops et soirées networking.\n\nRejoignez-nous pour partager vos projets et découvrir ceux des autres !";
const COMMENT = "Super événement, j'ai hâte d'y être ! Est-ce qu'on peut venir avec un ami ?";
const SAMPLE_MOMENT = {
  startsAt: new Date("2026-03-21T18:00:00.000Z"),
  timezone: "Europe/Paris",
  locationType: "IN_PERSON",
  locationName: "Le Cargo",
  locationAddress: "18 rue de la Paix, Paris",
  videoLink: null,
};
const UPDATED_MOMENT = {
  ...SAMPLE_MOMENT,
  startsAt: new Date("2026-03-22T18:00:00.000Z"),
  locationName: "Station F",
  locationAddress: "5 parvis Alan Turing, Paris",
};
const PRICE_CENTS = 1500;
const CURRENCY = "EUR";

type EmailDef = {
  id: string;
  group: EmailGroupId;
  label: string;
  recipient: string;
  subject: string;
  element: ReactElement;
};

/** Emails envoyés aux utilisateurs : construits dans la langue demandée. */
function localizedEmails(locale: PreviewLocale, t: EmailTranslations): EmailDef[] {
  const ctx = buildMomentEmailContext(SAMPLE_MOMENT, locale);
  const updatedCtx = buildMomentEmailContext(UPDATED_MOMENT, locale);
  const amount = formatPrice(PRICE_CENTS, CURRENCY, locale);
  const footer = t("common.footer");
  const momentCard = {
    momentTitle: MOMENT_TITLE,
    momentSlug: MOMENT_SLUG,
    momentDate: ctx.momentDate,
    momentDateMonth: ctx.momentDateMonth,
    momentDateDay: ctx.momentDateDay,
    locationText: ctx.locationText,
    circleName: CIRCLE_NAME,
    circleSlug: CIRCLE_SLUG,
  };
  const registrationStrings = (prefix: "registration" | "waitlist") => ({
    subject: t(`${prefix}.subject`, { momentTitle: MOMENT_TITLE }),
    heading: t(`${prefix}.heading`),
    statusMessage: t(`${prefix}.statusMessage`, { momentTitle: MOMENT_TITLE }),
    dateLabel: t("common.dateLabel"),
    locationLabel: t("common.locationLabel"),
    viewMomentCta: t("common.viewMomentCta"),
    cancelLink: t("common.cancelLink"),
    dashboardLink: t("common.dashboardLink"),
    paymentConfirmed: t("common.paymentConfirmed"),
    viewReceipt: t("common.viewReceipt"),
    footer,
  });
  const momentUpdateEmail = (prefix: "momentUpdate" | "hostMomentUpdate", to: string, playerName: string) => {
    const strings = {
      subject: t("momentUpdate.subject", { momentTitle: MOMENT_TITLE }),
      heading: t(`${prefix}.heading`),
      intro: t(`${prefix}.intro`),
      dateChangedLabel: t("momentUpdate.dateChangedLabel"),
      locationChangedLabel: t("momentUpdate.locationChangedLabel"),
      dateLabel: t("common.dateLabel"),
      locationLabel: t("common.locationLabel"),
      viewMomentCta: t("common.viewMomentCta"),
      footer,
    };
    return {
      subject: strings.subject,
      element: MomentUpdateEmail({
        to,
        playerName,
        momentTitle: MOMENT_TITLE,
        momentSlug: MOMENT_SLUG,
        momentDate: updatedCtx.momentDate,
        momentDateMonth: updatedCtx.momentDateMonth,
        momentDateDay: updatedCtx.momentDateDay,
        locationText: updatedCtx.locationText,
        circleName: CIRCLE_NAME,
        circleSlug: CIRCLE_SLUG,
        dateChanged: true,
        locationChanged: true,
        strings,
        baseUrl: BASE_URL,
      }),
    };
  };
  const approvalEmail = (
    strings: { subject: string; heading: string; message: string; ctaLabel: string },
    recipientName: string,
    entitySlug: string
  ) => ({
    subject: strings.subject,
    element: ApprovalNotificationEmail({
      recipientName,
      heading: strings.heading,
      message: strings.message,
      ctaLabel: strings.ctaLabel,
      ctaUrl: `${BASE_URL}/${entitySlug}`,
      footer,
    }),
  });
  const cancellationEmail = (
    prefix: "registered" | "waitlistLeft",
    refundMessage: string | null
  ) => {
    const strings = {
      subject: t(`cancellationConfirmation.${prefix}.subject`, { momentTitle: MOMENT_TITLE }),
      heading: t(`cancellationConfirmation.${prefix}.heading`),
      message: t(`cancellationConfirmation.${prefix}.message`, { momentTitle: MOMENT_TITLE }),
      refundMessage,
      ctaLabel: t("cancellationConfirmation.ctaLabel"),
      footer,
    };
    return {
      subject: strings.subject,
      element: CancellationConfirmationEmail({
        to: "alice@example.com",
        momentTitle: MOMENT_TITLE,
        momentSlug: MOMENT_SLUG,
        momentDateMonth: ctx.momentDateMonth,
        momentDateDay: ctx.momentDateDay,
        strings,
        baseUrl: BASE_URL,
      }),
    };
  };
  const hostNewRegistrationEmail = (registrationInfo: string) => {
    const strings = {
      subject: t("hostNotification.subject", { playerName: PLAYER, momentTitle: MOMENT_TITLE }),
      heading: t("hostNotification.heading"),
      message: t("hostNotification.message", { playerName: PLAYER, momentTitle: MOMENT_TITLE }),
      manageRegistrationsCta: t("hostNotification.manageRegistrationsCta"),
      footer,
    };
    return {
      subject: strings.subject,
      element: HostNewRegistrationEmail({
        to: "bob@example.com",
        hostName: HOST,
        playerName: PLAYER,
        momentTitle: MOMENT_TITLE,
        momentSlug: MOMENT_SLUG,
        circleSlug: CIRCLE_SLUG,
        registrationInfo,
        strings,
        baseUrl: BASE_URL,
      }),
    };
  };
  const hostCancellationEmail = (refunded: boolean) => {
    const strings = {
      subject: t("hostCancellation.subject", { playerName: PLAYER, momentTitle: MOMENT_TITLE }),
      heading: t("hostCancellation.heading"),
      message: t("hostCancellation.message", { playerName: PLAYER, momentTitle: MOMENT_TITLE }),
      refundMessage: refunded ? t("hostCancellation.refunded", { amount }) : t("hostCancellation.notRefunded"),
      manageRegistrationsCta: t("hostCancellation.manageCta"),
      footer,
    };
    return {
      subject: strings.subject,
      element: HostCancellationEmail({
        to: "bob@example.com",
        hostName: HOST,
        playerName: PLAYER,
        momentTitle: MOMENT_TITLE,
        momentSlug: MOMENT_SLUG,
        circleSlug: CIRCLE_SLUG,
        amountRefunded: refunded ? amount : null,
        strings,
        baseUrl: BASE_URL,
      }),
    };
  };
  const welcome = getOnboardingWelcomeContent(locale);

  return [
    // ── Participant ─────────────────────────────────────────────
    {
      id: "registration-confirmation",
      group: "participant",
      label: "Inscription confirmée",
      recipient: "Participant qui s'inscrit (ou validé par l'Organisateur)",
      subject: registrationStrings("registration").subject,
      element: RegistrationConfirmationEmail({
        to: "alice@example.com",
        playerName: PLAYER,
        ...momentCard,
        status: "REGISTERED",
        strings: registrationStrings("registration"),
        baseUrl: BASE_URL,
      }),
    },
    {
      id: "registration-waitlisted",
      group: "participant",
      label: "Inscription en liste d'attente",
      recipient: "Participant inscrit sur un événement complet",
      subject: registrationStrings("waitlist").subject,
      element: RegistrationConfirmationEmail({
        to: "alice@example.com",
        playerName: PLAYER,
        ...momentCard,
        status: "WAITLISTED",
        strings: registrationStrings("waitlist"),
        baseUrl: BASE_URL,
      }),
    },
    {
      id: "waitlist-promotion",
      group: "participant",
      label: "Place libérée (sortie de liste d'attente)",
      recipient: "Participant promu depuis la liste d'attente",
      subject: t("promotion.subject", { momentTitle: MOMENT_TITLE }),
      element: WaitlistPromotionEmail({
        to: "alice@example.com",
        playerName: PLAYER,
        ...momentCard,
        strings: {
          subject: t("promotion.subject", { momentTitle: MOMENT_TITLE }),
          heading: t("promotion.heading"),
          statusMessage: t("promotion.statusMessage", { momentTitle: MOMENT_TITLE }),
          dateLabel: t("common.dateLabel"),
          locationLabel: t("common.locationLabel"),
          viewMomentCta: t("common.viewMomentCta"),
          footer,
        },
        baseUrl: BASE_URL,
      }),
    },
    {
      id: "registration-reminder",
      group: "participant",
      label: "Rappel 24h avant l'événement",
      recipient: "Chaque inscrit, la veille",
      subject: t("reminder.subject", { momentTitle: MOMENT_TITLE }),
      element: RegistrationReminderEmail({
        to: "alice@example.com",
        playerName: PLAYER,
        ...momentCard,
        momentDateMonth: ctx.momentDateMonth.toUpperCase(),
        strings: {
          subject: t("reminder.subject", { momentTitle: MOMENT_TITLE }),
          heading: t("reminder.heading"),
          dateLabel: t("common.dateLabel"),
          locationLabel: t("common.locationLabel"),
          viewMomentCta: t("common.viewMomentCta"),
          footer: t("reminder.footer"),
        },
        baseUrl: BASE_URL,
      }),
    },
    {
      id: "cancellation-confirmation",
      group: "participant",
      label: "Désinscription confirmée (remboursée)",
      recipient: "Participant qui annule son inscription",
      ...cancellationEmail("registered", t("cancellationConfirmation.refunded", { amount })),
    },
    {
      id: "cancellation-not-refunded",
      group: "participant",
      label: "Désinscription confirmée (événement payant non remboursable)",
      recipient: "Participant qui annule son inscription",
      ...cancellationEmail("registered", t("cancellationConfirmation.notRefunded")),
    },
    {
      id: "waitlist-left",
      group: "participant",
      label: "Sortie de la liste d'attente",
      recipient: "Participant qui quitte la liste d'attente",
      ...cancellationEmail("waitlistLeft", null),
    },
    {
      id: "registration-rejected",
      group: "participant",
      label: "Demande d'inscription refusée",
      recipient: "Participant dont la demande est refusée",
      ...approvalEmail(
        {
          subject: t("approvalNotification.registrationRejectedSubject", { momentTitle: MOMENT_TITLE }),
          heading: t("approvalNotification.rejectedHeading"),
          message: t("approvalNotification.registrationRejectedMessage", { momentTitle: MOMENT_TITLE }),
          ctaLabel: t("approvalNotification.viewMomentCta"),
        },
        PLAYER,
        `m/${MOMENT_SLUG}`
      ),
    },
    {
      id: "registration-removed-by-host",
      group: "participant",
      label: "Inscription invalidée par l'Organisateur",
      recipient: "Participant retiré d'un événement",
      subject: t("registrationRemovedByHost.subject", { momentTitle: MOMENT_TITLE }),
      element: RegistrationRemovedByHostEmail({
        to: "alice@example.com",
        playerName: PLAYER,
        ...momentCard,
        strings: {
          subject: t("registrationRemovedByHost.subject", { momentTitle: MOMENT_TITLE }),
          heading: t("registrationRemovedByHost.heading"),
          message: t("registrationRemovedByHost.message", {
            circleName: CIRCLE_NAME,
            momentTitle: MOMENT_TITLE,
          }),
          ctaLabel: t("registrationRemovedByHost.ctaLabel"),
          footer,
        },
        baseUrl: BASE_URL,
      }),
    },

    // ── Membres de la Communauté ─────────────────────────────────
    {
      id: "new-moment-notification",
      group: "members",
      label: "Nouvel événement publié",
      recipient: "Membres de la Communauté (sauf désabonnés)",
      subject: t("newMomentNotification.subject", { circleName: CIRCLE_NAME }),
      element: NewMomentNotificationEmail({
        to: "alice@example.com",
        recipientName: "Alice",
        circleName: CIRCLE_NAME,
        circleSlug: CIRCLE_SLUG,
        momentTitle: MOMENT_TITLE,
        momentSlug: MOMENT_SLUG,
        momentDate: ctx.momentDate,
        momentDateMonth: ctx.momentDateMonth.toUpperCase(),
        momentDateDay: ctx.momentDateDay,
        momentLocation: ctx.locationText,
        strings: {
          subject: t("newMomentNotification.subject", { circleName: CIRCLE_NAME }),
          preheader: t("newMomentNotification.preheader"),
          heading: t("newMomentNotification.heading", { circleName: CIRCLE_NAME }),
          intro: t("newMomentNotification.intro"),
          dateLabel: t("common.dateLabel"),
          locationLabel: t("common.locationLabel"),
          ctaLabel: t("newMomentNotification.ctaLabel"),
          unsubscribeText: t("newMomentNotification.unsubscribeText", { circleName: CIRCLE_NAME }),
          unsubscribeLabel: t("newMomentNotification.unsubscribeLabel"),
        },
        baseUrl: BASE_URL,
      }),
    },
    {
      id: "moment-update",
      group: "members",
      label: "Événement modifié (date et lieu)",
      recipient: "Inscrits de l'événement",
      ...momentUpdateEmail("momentUpdate", "alice@example.com", PLAYER),
    },
    {
      id: "moment-cancelled",
      group: "members",
      label: "Événement annulé",
      recipient: "Inscrits de l'événement",
      subject: t("momentCancelled.subject", { momentTitle: MOMENT_TITLE }),
      element: MomentCancelledEmail({
        to: "alice@example.com",
        recipientName: PLAYER,
        momentTitle: MOMENT_TITLE,
        momentDate: ctx.momentDate,
        momentDateMonth: ctx.momentDateMonth.toUpperCase(),
        momentDateDay: ctx.momentDateDay,
        locationText: ctx.locationText,
        momentSlug: MOMENT_SLUG,
        hostMessage:
          "Désolé pour ce contretemps : le lieu s'est désisté à la dernière minute. On reprogramme très vite, merci de votre compréhension !",
        strings: {
          subject: t("momentCancelled.subject", { momentTitle: MOMENT_TITLE }),
          heading: t("momentCancelled.heading"),
          message: t("momentCancelled.message", { momentTitle: MOMENT_TITLE }),
          hostMessageLabel: t("momentCancelled.hostMessageLabel"),
          ctaLabel: t("momentCancelled.ctaLabel"),
          footer,
        },
        baseUrl: BASE_URL,
      }),
    },
    {
      id: "moment-host-message",
      group: "members",
      label: "Message de l'Organisateur aux inscrits",
      recipient: "Inscrits de l'événement (segment choisi)",
      subject: "Changement de salle pour vendredi",
      element: MomentHostMessageEmail({
        to: "alice@example.com",
        replyTo: "bob@example.com",
        hostName: HOST,
        hostFirstName: "Bob",
        hostAvatarUrl: null,
        subject: "Changement de salle pour vendredi",
        // Objet et corps rédigés par l'Organisateur (non traduits) ; placeholder prénom résolu.
        bodyHtml:
          "<p>Bonjour Alice,</p><p>Petit changement pour vendredi : nous serons finalement dans la <strong>salle Horizon, au 2e étage</strong> (même adresse).</p><ul><li>Accueil dès 18h30</li><li>Début des talks à 19h</li></ul><p>À vendredi !</p>",
        momentTitle: MOMENT_TITLE,
        momentDate: ctx.momentDate,
        momentDateMonth: ctx.momentDateMonth.toUpperCase(),
        momentDateDay: ctx.momentDateDay,
        momentLocation: ctx.locationText,
        momentSlug: MOMENT_SLUG,
        appUrl: BASE_URL,
        strings: {
          preheader: t("momentHostMessage.preheader", { hostName: HOST, momentTitle: MOMENT_TITLE }),
          dateLabel: t("momentHostMessage.dateLabel"),
          locationLabel: t("momentHostMessage.locationLabel"),
          ctaLabel: t("momentHostMessage.ctaLabel"),
          footer: t("momentHostMessage.footer", { momentTitle: MOMENT_TITLE }),
        },
      }),
    },
    {
      id: "new-comment",
      group: "members",
      label: "Nouveau commentaire",
      recipient: "Inscrits et Organisateurs (sauf l'auteur)",
      subject: t("commentNotification.subject", { playerName: COMMENTER, momentTitle: MOMENT_TITLE }),
      element: NewCommentEmail({
        to: "alice@example.com",
        recipientName: PLAYER,
        playerName: COMMENTER,
        momentTitle: MOMENT_TITLE,
        momentSlug: MOMENT_SLUG,
        commentPreview: COMMENT,
        strings: {
          subject: t("commentNotification.subject", { playerName: COMMENTER, momentTitle: MOMENT_TITLE }),
          heading: t("commentNotification.heading"),
          message: t("commentNotification.message", { playerName: COMMENTER, momentTitle: MOMENT_TITLE }),
          commentPreviewLabel: t("commentNotification.commentPreviewLabel"),
          viewCommentCta: t("commentNotification.viewCommentCta"),
          manageNotifications: t("commentNotification.manageNotifications"),
          footer,
        },
        baseUrl: BASE_URL,
      }),
    },
    {
      id: "circle-invitation",
      group: "members",
      label: "Invitation à rejoindre la Communauté",
      recipient: "Adresse invitée (langue de l'Organisateur qui invite)",
      subject: t("circleInvitation.subject", { inviterName: HOST, circleName: CIRCLE_NAME }),
      element: CircleInvitationEmail({
        to: "alice@example.com",
        inviterName: HOST,
        circleName: CIRCLE_NAME,
        circleDescription: CIRCLE_DESCRIPTION,
        circleSlug: CIRCLE_SLUG,
        coverImageUrl: null,
        memberCount: 47,
        momentCount: 3,
        circleUrl: `${BASE_URL}/circles/${CIRCLE_SLUG}`,
        strings: {
          subject: t("circleInvitation.subject", { inviterName: HOST, circleName: CIRCLE_NAME }),
          ctaLabel: t("circleInvitation.ctaLabel"),
          footer: t("circleInvitation.footer", { inviterName: HOST }),
          invitesYouToJoin: t("circleInvitation.invitesYouToJoin"),
          seeMore: t("circleInvitation.seeMore"),
          memberCountLabel: t("circleInvitation.memberCountLabel", { count: 47 }),
          momentCountLabel: t("circleInvitation.momentCountLabel", { count: 3 }),
        },
      }),
    },
    {
      id: "membership-approved",
      group: "members",
      label: "Adhésion acceptée",
      recipient: "Membre dont la demande d'adhésion est acceptée",
      ...approvalEmail(
        {
          subject: t("approvalNotification.membershipApprovedSubject", { circleName: CIRCLE_NAME }),
          heading: t("approvalNotification.membershipApprovedHeading"),
          message: t("approvalNotification.membershipApprovedMessage", { circleName: CIRCLE_NAME }),
          ctaLabel: t("approvalNotification.viewCircleCta"),
        },
        PLAYER,
        `circles/${CIRCLE_SLUG}`
      ),
    },
    {
      id: "membership-rejected",
      group: "members",
      label: "Adhésion refusée",
      recipient: "Personne dont la demande d'adhésion est refusée",
      ...approvalEmail(
        {
          subject: t("approvalNotification.membershipRejectedSubject", { circleName: CIRCLE_NAME }),
          heading: t("approvalNotification.rejectedHeading"),
          message: t("approvalNotification.membershipRejectedMessage", { circleName: CIRCLE_NAME }),
          ctaLabel: t("approvalNotification.viewCircleCta"),
        },
        PLAYER,
        `circles/${CIRCLE_SLUG}`
      ),
    },
    {
      id: "member-removed-from-circle",
      group: "members",
      label: "Retiré de la Communauté",
      recipient: "Membre retiré par l'Organisateur",
      subject: t("memberRemovedFromCircle.subject", { circleName: CIRCLE_NAME }),
      element: MemberRemovedFromCircleEmail({
        to: "alice@example.com",
        memberName: PLAYER,
        circleName: CIRCLE_NAME,
        cancelledRegistrations: 2,
        strings: {
          subject: t("memberRemovedFromCircle.subject", { circleName: CIRCLE_NAME }),
          heading: t("memberRemovedFromCircle.heading"),
          message: t("memberRemovedFromCircle.message", { circleName: CIRCLE_NAME }),
          cancelledRegistrationsMessage: t("memberRemovedFromCircle.cancelledRegistrationsMessage", {
            count: 2,
          }),
          ctaLabel: t("memberRemovedFromCircle.ctaLabel"),
          footer,
        },
        baseUrl: BASE_URL,
      }),
    },
    {
      id: "co-host-promoted",
      group: "members",
      label: "Promu co-organisateur",
      recipient: "Membre promu co-organisateur",
      subject: t("coHostPromoted.subject", { circleName: CIRCLE_NAME }),
      element: CoHostPromotedEmail({
        to: "alice@example.com",
        recipientName: PLAYER,
        inviterName: HOST,
        circleName: CIRCLE_NAME,
        circleSlug: CIRCLE_SLUG,
        circleCoverImage: null,
        strings: {
          subject: t("coHostPromoted.subject", { circleName: CIRCLE_NAME }),
          heading: t("coHostPromoted.heading", { circleName: CIRCLE_NAME }),
          intro: t("coHostPromoted.intro", { inviterName: HOST }),
          rightsTitle: t("coHostPromoted.rightsTitle"),
          rightCreateEvents: t("coHostPromoted.rightCreateEvents"),
          rightManageRegistrations: t("coHostPromoted.rightManageRegistrations"),
          rightUpdateCircle: t("coHostPromoted.rightUpdateCircle"),
          rightBroadcast: t("coHostPromoted.rightBroadcast"),
          rightReceiveNotifications: t("coHostPromoted.rightReceiveNotifications"),
          limitsNote: t("coHostPromoted.limitsNote"),
          ctaLabel: t("coHostPromoted.ctaLabel"),
          footer: t("coHostPromoted.footer"),
          leaveLink: t("coHostPromoted.leaveLink"),
        },
        baseUrl: BASE_URL,
      }),
    },
    {
      id: "co-host-demoted",
      group: "members",
      label: "Retiré des co-organisateurs",
      recipient: "Co-organisateur rétrogradé en membre",
      subject: t("coHostDemoted.subject", { circleName: CIRCLE_NAME }),
      element: CoHostDemotedEmail({
        to: "alice@example.com",
        recipientName: PLAYER,
        circleName: CIRCLE_NAME,
        circleSlug: CIRCLE_SLUG,
        circleCoverImage: null,
        strings: {
          subject: t("coHostDemoted.subject", { circleName: CIRCLE_NAME }),
          heading: t("coHostDemoted.heading", { circleName: CIRCLE_NAME }),
          intro: t("coHostDemoted.intro", { circleName: CIRCLE_NAME }),
          newRoleLabel: t("coHostDemoted.newRoleLabel"),
          registrationsNote: t("coHostDemoted.registrationsNote"),
          ctaLabel: t("coHostDemoted.ctaLabel"),
          footer: t("coHostDemoted.footer"),
          preferencesLink: t("coHostDemoted.preferencesLink"),
        },
        baseUrl: BASE_URL,
      }),
    },

    // ── Organisateur ────────────────────────────────────────────
    {
      id: "host-new-registration",
      group: "host",
      label: "Nouvelle inscription",
      recipient: "Organisateurs de la Communauté",
      ...hostNewRegistrationEmail(t("hostNotification.registrationInfo", { count: 12, capacity: 30 })),
    },
    {
      id: "host-new-registration-unlimited",
      group: "host",
      label: "Nouvelle inscription (places illimitées)",
      recipient: "Organisateurs de la Communauté",
      ...hostNewRegistrationEmail(t("hostNotification.registrationInfoUnlimited", { count: 12 })),
    },
    {
      id: "host-pending-registration",
      group: "host",
      label: "Demande d'inscription à valider",
      recipient: "Organisateurs (événement avec validation)",
      ...approvalEmail(
        {
          subject: t("approvalNotification.hostPendingRegistrationSubject", {
            playerName: PLAYER,
            momentTitle: MOMENT_TITLE,
          }),
          heading: t("approvalNotification.hostPendingRegistrationHeading"),
          message: t("approvalNotification.hostPendingRegistrationMessage", {
            playerName: PLAYER,
            momentTitle: MOMENT_TITLE,
          }),
          ctaLabel: t("approvalNotification.manageCta"),
        },
        HOST,
        `dashboard/circles/${CIRCLE_SLUG}/moments/${MOMENT_SLUG}`
      ),
    },
    {
      id: "host-cancellation",
      group: "host",
      label: "Désinscription d'un participant (remboursée)",
      recipient: "Organisateurs de la Communauté",
      ...hostCancellationEmail(true),
    },
    {
      id: "host-cancellation-not-refunded",
      group: "host",
      label: "Désinscription d'un participant (non remboursable)",
      recipient: "Organisateurs de la Communauté",
      ...hostCancellationEmail(false),
    },
    {
      id: "host-new-circle-member",
      group: "host",
      label: "Nouveau membre dans la Communauté",
      recipient: "Organisateurs de la Communauté",
      subject: t("hostCircleMemberNotification.subject", { playerName: PLAYER, circleName: CIRCLE_NAME }),
      element: HostNewCircleMemberEmail({
        to: "bob@example.com",
        hostName: HOST,
        playerName: PLAYER,
        circleName: CIRCLE_NAME,
        circleSlug: CIRCLE_SLUG,
        memberCount: 48,
        strings: {
          subject: t("hostCircleMemberNotification.subject", { playerName: PLAYER, circleName: CIRCLE_NAME }),
          heading: t("hostCircleMemberNotification.heading"),
          message: t("hostCircleMemberNotification.message", { playerName: PLAYER, circleName: CIRCLE_NAME }),
          memberCountInfo: t("hostCircleMemberNotification.memberCountInfo", { count: 48 }),
          manageMembersCta: t("hostCircleMemberNotification.manageMembersCta"),
          footer,
        },
        baseUrl: BASE_URL,
      }),
    },
    {
      id: "host-pending-membership",
      group: "host",
      label: "Demande d'adhésion à valider",
      recipient: "Organisateurs (Communauté avec validation)",
      ...approvalEmail(
        {
          subject: t("approvalNotification.hostPendingMembershipSubject", {
            playerName: PLAYER,
            circleName: CIRCLE_NAME,
          }),
          heading: t("approvalNotification.hostPendingMembershipHeading"),
          message: t("approvalNotification.hostPendingMembershipMessage", {
            playerName: PLAYER,
            circleName: CIRCLE_NAME,
          }),
          ctaLabel: t("approvalNotification.manageCta"),
        },
        HOST,
        `dashboard/circles/${CIRCLE_SLUG}`
      ),
    },
    {
      id: "host-moment-created",
      group: "host",
      label: "Événement publié",
      recipient: "Organisateur qui publie",
      subject: t("hostMomentCreated.subject", { momentTitle: MOMENT_TITLE }),
      element: HostMomentCreatedEmail({
        to: "bob@example.com",
        hostName: HOST,
        momentTitle: MOMENT_TITLE,
        momentSlug: MOMENT_SLUG,
        circleSlug: CIRCLE_SLUG,
        momentDate: ctx.momentDate,
        momentDateMonth: ctx.momentDateMonth.toUpperCase(),
        momentDateDay: ctx.momentDateDay,
        locationText: ctx.locationText,
        circleName: CIRCLE_NAME,
        strings: {
          subject: t("hostMomentCreated.subject", { momentTitle: MOMENT_TITLE }),
          heading: t("hostMomentCreated.heading"),
          statusMessage: t("hostMomentCreated.statusMessage", { momentTitle: MOMENT_TITLE }),
          dateLabel: t("common.dateLabel"),
          locationLabel: t("common.locationLabel"),
          manageMomentCta: t("hostMomentCreated.manageMomentCta"),
          footer,
        },
        baseUrl: BASE_URL,
      }),
    },
    {
      id: "host-moment-update",
      group: "host",
      label: "Événement modifié (version Organisateur)",
      recipient: "Organisateurs de la Communauté",
      ...momentUpdateEmail("hostMomentUpdate", "bob@example.com", HOST),
    },
    {
      id: "host-contact-message",
      group: "host",
      label: "Message d'un membre (Contacter l'organisateur)",
      recipient: "Organisateurs de la Communauté",
      subject: t("hostContactMessage.subject"),
      element: HostContactMessageEmail({
        to: "bob@example.com",
        replyTo: "alice@example.com",
        recipientName: HOST,
        message:
          "Bonjour Bob,\n\nUne question rapide sur l'événement : est-ce que les places sont en accès libre une fois sur place, ou y a-t-il un check-in à l'entrée ? Je risque d'arriver un peu en retard.\n\nMerci pour l'organisation, je suis vraiment ravie de pouvoir y assister !\n\nAlice",
        aboutLine: t("hostContactMessage.aboutEvent", { momentTitle: MOMENT_TITLE, circleName: CIRCLE_NAME }),
        appUrl: BASE_URL,
        strings: {
          subject: t("hostContactMessage.subject"),
          heading: t("hostContactMessage.heading"),
          intro: t("hostContactMessage.intro", { senderName: PLAYER }),
          messageLabel: t("hostContactMessage.messageLabel"),
          replyHint: t("hostContactMessage.replyHint", {
            senderName: PLAYER,
            senderEmail: "alice@example.com",
          }),
          footer: t("hostContactMessage.footer"),
        },
      }),
    },

    // ── Connexion et compte ─────────────────────────────────────
    {
      id: "magic-link",
      group: "account",
      label: "Lien de connexion",
      recipient: "Personne qui se connecte (langue de la page de connexion)",
      subject: t("magicLink.subject"),
      element: MagicLinkEmail({
        url: `${BASE_URL}/auth/verify?token=abc123`,
        baseUrl: BASE_URL,
        strings: {
          preview: t("magicLink.preview"),
          heading: t("magicLink.heading"),
          bodyText: t("magicLink.bodyText"),
          ctaLabel: t("magicLink.ctaLabel"),
          expiryText: t("magicLink.expiryText"),
          securityText: t("magicLink.securityText"),
          footer: t("magicLink.footer"),
        },
      }),
    },
    {
      id: "onboarding-welcome",
      group: "account",
      label: "Lettre du fondateur (bienvenue)",
      recipient: "Nouvel inscrit, le lendemain",
      subject: welcome.subject,
      element: OnboardingWelcomeEmail({ firstName: "Alice", baseUrl: APP_URL, locale }),
    },
  ];
}

/**
 * Emails internes à l'équipe : en français uniquement. Textes recopiés de
 * notify-admin-*.ts et profile.ts (non traduits, écrits dans le code d'envoi) :
 * à tenir alignés à la main.
 */
function adminEmails(): EmailDef[] {
  const ctx = buildMomentEmailContext(SAMPLE_MOMENT, "fr");
  const adminFooter = "Vous recevez cet email car vous êtes administrateur de The Playground.";
  return [
    {
      id: "admin-new-user",
      group: "admin",
      label: "Nouvel utilisateur",
      recipient: "Admins plateforme",
      subject: `[Admin] Nouvel utilisateur — ${PLAYER}`,
      element: AdminNewUserEmail({
        to: "admin@the-playground.fr",
        userName: PLAYER,
        userEmail: "alice@example.com",
        registeredAt: "samedi 15 mars 2026",
        adminUsersUrl: `${BASE_URL}/admin/users`,
        strings: {
          subject: `[Admin] Nouvel utilisateur — ${PLAYER}`,
          heading: "Nouvel utilisateur sur The Playground",
          message: `${PLAYER} vient de compléter son inscription.`,
          ctaLabel: "Voir les utilisateurs dans l'admin",
          footer: adminFooter,
        },
        baseUrl: BASE_URL,
      }),
    },
    {
      id: "admin-entity-created",
      group: "admin",
      label: "Nouvelle Communauté",
      recipient: "Admins plateforme",
      subject: `[Admin] Nouvelle Communauté créée — ${CIRCLE_NAME}`,
      element: AdminEntityCreatedEmail({
        to: "admin@the-playground.fr",
        entityType: "circle",
        entityName: CIRCLE_NAME,
        creatorName: HOST,
        creatorEmail: "bob@example.com",
        entityUrl: `${BASE_URL}/dashboard/circles/${CIRCLE_SLUG}`,
        strings: {
          subject: `[Admin] Nouvelle Communauté créée — ${CIRCLE_NAME}`,
          heading: "Nouvelle Communauté sur The Playground",
          message: `${HOST} vient de créer une nouvelle Communauté.`,
          ctaLabel: "Voir la Communauté dans l'admin",
          footer: adminFooter,
        },
        baseUrl: BASE_URL,
      }),
    },
    {
      id: "admin-entity-created-moment",
      group: "admin",
      label: "Nouvel événement",
      recipient: "Admins plateforme",
      subject: `[Admin] Nouvel événement créé — ${MOMENT_TITLE}`,
      element: AdminEntityCreatedEmail({
        to: "admin@the-playground.fr",
        entityType: "moment",
        entityName: MOMENT_TITLE,
        creatorName: HOST,
        creatorEmail: "bob@example.com",
        circleName: CIRCLE_NAME,
        momentDate: ctx.momentDate,
        locationText: ctx.locationText,
        entityUrl: `${BASE_URL}/dashboard/circles/${CIRCLE_SLUG}/moments/${MOMENT_SLUG}`,
        strings: {
          subject: `[Admin] Nouvel événement créé — ${MOMENT_TITLE}`,
          heading: "Nouvel événement sur The Playground",
          message: `${HOST} vient de créer un nouvel événement.`,
          ctaLabel: "Voir l'événement dans l'admin",
          footer: adminFooter,
          dateLabel: "Date",
          locationLabel: "Lieu",
        },
        baseUrl: BASE_URL,
      }),
    },
    {
      id: "admin-moment-updated",
      group: "admin",
      label: "Événement modifié",
      recipient: "Admins plateforme",
      subject: `[Admin] Événement modifié — ${MOMENT_TITLE}`,
      element: AdminMomentUpdatedEmail({
        to: "admin@the-playground.fr",
        momentTitle: MOMENT_TITLE,
        circleName: CIRCLE_NAME,
        hostName: HOST,
        hostEmail: "bob@example.com",
        momentUrl: `${BASE_URL}/dashboard/circles/${CIRCLE_SLUG}/moments/${MOMENT_SLUG}`,
        momentDate: ctx.momentDate,
        locationText: ctx.locationText,
        changedFields: ["Date", "Lieu", "Capacité"],
        strings: {
          subject: `[Admin] Événement modifié — ${MOMENT_TITLE}`,
          heading: "Événement modifié sur The Playground",
          message: `${HOST} vient de modifier un événement publié.`,
          changesLabel: "Champs modifiés",
          dateLabel: "Date",
          locationLabel: "Lieu",
          ctaLabel: "Voir l'événement dans l'admin",
          footer: adminFooter,
        },
        baseUrl: BASE_URL,
      }),
    },
    {
      id: "admin-comment-pending",
      group: "admin",
      label: "Commentaire à modérer",
      recipient: "Admins plateforme",
      subject: `[Admin] Commentaire à valider — ${MOMENT_TITLE}`,
      element: AdminCommentPendingEmail({
        to: "admin@the-playground.fr",
        playerName: COMMENTER,
        momentTitle: MOMENT_TITLE,
        commentPreview: COMMENT,
        adminUrl: `${BASE_URL}/admin/insights/comments?status=pending`,
        strings: {
          subject: `[Admin] Commentaire à valider — ${MOMENT_TITLE}`,
          heading: "Commentaire en attente de validation",
          message: `${COMMENTER} (compte récent) a commenté un événement. Le commentaire n'est pas visible tant que vous ne l'avez pas validé.`,
          commentLabel: "Commentaire",
          ctaLabel: "Modérer le commentaire",
          footer: adminFooter,
        },
        baseUrl: BASE_URL,
      }),
    },
  ];
}

async function renderAll(defs: EmailDef[], locale: PreviewLocale | "fr-only"): Promise<EmailPreview[]> {
  return Promise.all(
    defs.map(async ({ element, ...meta }) => ({
      ...meta,
      locale,
      html: await render(element),
    }))
  );
}

async function buildPreviews(): Promise<EmailPreview[]> {
  const locales: PreviewLocale[] = ["fr", "en"];
  const localized = await Promise.all(
    locales.map(async (locale) => {
      const t = await getTranslations({ locale, namespace: "Email" });
      return renderAll(localizedEmails(locale, t), locale);
    })
  );
  return [...localized.flat(), ...(await renderAll(adminEmails(), "fr-only"))];
}

export default async function EmailPreviewPage() {
  return <EmailPreviewClient previews={await buildPreviews()} />;
}
