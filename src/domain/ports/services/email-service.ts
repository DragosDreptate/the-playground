import type { RegistrationStatus } from "@/domain/models/registration";

// --- Payload types ---

export type RegistrationConfirmationEmailData = {
  to: string;
  playerName: string;
  momentTitle: string;
  momentSlug: string;
  momentDate: string; // Pre-formatted date string
  momentDateMonth: string; // Short month for calendar badge (e.g. "FÉV", "FEB")
  momentDateDay: string; // Day number for calendar badge (e.g. "27")
  locationText: string;
  circleName: string;
  circleSlug: string;
  status: RegistrationStatus; // REGISTERED or WAITLISTED
  icsContent?: string; // iCalendar (.ics) attachment — only for REGISTERED
  amountPaid?: string; // Pre-formatted price (e.g. "15,00 €") — only for paid events
  receiptUrl?: string; // Stripe receipt URL — only for paid events
  strings: {
    subject: string;
    heading: string;
    statusMessage: string;
    dateLabel: string;
    locationLabel: string;
    viewMomentCta: string;
    cancelLink: string;
    dashboardLink: string;
    paymentConfirmed?: string; // e.g. "Paiement confirmé"
    viewReceipt?: string; // e.g. "Voir mon reçu"
    footer: string;
  };
};

export type WaitlistPromotionEmailData = {
  to: string;
  playerName: string;
  momentTitle: string;
  momentSlug: string;
  momentDate: string;
  momentDateMonth: string;
  momentDateDay: string;
  locationText: string;
  circleName: string;
  circleSlug: string;
  icsContent?: string; // iCalendar (.ics) attachment — promoted = confirmed
  strings: {
    subject: string;
    heading: string;
    statusMessage: string;
    dateLabel: string;
    locationLabel: string;
    viewMomentCta: string;
    footer: string;
  };
};

export type HostPaidCancellationEmailData = {
  to: string;
  hostName: string;
  playerName: string;
  momentTitle: string;
  momentSlug: string;
  circleSlug: string;
  amountRefunded: string | null; // Pre-formatted: "15,00 EUR" or null if non-refundable
  strings: {
    subject: string;
    heading: string;
    message: string;
    refundMessage: string | null;
    manageRegistrationsCta: string;
    footer: string;
  };
};

export type HostNewRegistrationEmailData = {
  to: string;
  hostName: string;
  playerName: string;
  momentTitle: string;
  momentSlug: string;
  circleSlug: string;
  registrationInfo: string; // Pre-formatted: "X inscrit(s) / Y places" or "X inscrit(s)"
  strings: {
    subject: string;
    heading: string;
    message: string; // Pre-formatted: "{playerName} joined {momentTitle}"
    manageRegistrationsCta: string;
    footer: string;
  };
};

export type NewCommentEmailData = {
  to: string;
  recipientName: string;
  playerName: string;
  momentTitle: string;
  momentSlug: string;
  commentPreview: string; // Comment content truncated to 200 chars
  strings: {
    subject: string;
    heading: string;
    message: string; // Pre-formatted: "{playerName} commented on {momentTitle}"
    commentPreviewLabel: string;
    viewCommentCta: string;
    manageNotifications: string;
    footer: string;
  };
};

export type NewMomentNotificationStrings = {
  subject: string;
  preheader: string;
  heading: string;
  intro: string;
  dateLabel: string;
  locationLabel: string;
  ctaLabel: string;
  unsubscribeText: string;
  unsubscribeLabel: string;
};

export type NewMomentMemberEmailData = {
  to: string;
  recipientName: string;
  circleName: string;
  circleSlug: string;
  momentTitle: string;
  momentSlug: string;
  momentDate: string;
  momentDateMonth: string;
  momentDateDay: string;
  momentLocation: string;
  strings: NewMomentNotificationStrings;
};

export type MomentUpdateEmailData = {
  to: string;
  playerName: string;
  momentTitle: string;
  momentSlug: string;
  momentDate: string;
  momentDateMonth: string;
  momentDateDay: string;
  locationText: string;
  circleName: string;
  circleSlug: string;
  dateChanged: boolean;
  locationChanged: boolean;
  icsContent?: string;
  strings: {
    subject: string;
    heading: string;
    intro: string;
    dateChangedLabel: string;
    locationChangedLabel: string;
    dateLabel: string;
    locationLabel: string;
    viewMomentCta: string;
    footer: string;
  };
};

export type MomentCancelledEmailData = {
  to: string;
  recipientName: string;
  momentTitle: string;
  momentDate: string;
  momentDateMonth: string;
  momentDateDay: string;
  locationText: string;
  circleName: string;
  circleSlug: string;
  refundMessage?: string; // e.g. "Vous serez remboursé de 15,00 € sous 5-10 jours"
  strings: {
    subject: string;
    heading: string;
    message: string;
    ctaLabel: string;
    footer: string;
  };
};

export type MomentHostMessageEmailData = {
  to: string;
  /** Email de l'Organisateur — les réponses lui arrivent directement. */
  replyTo: string;
  /** Nom affiché de l'Organisateur (from + tête de l'email). */
  hostName: string;
  hostAvatarUrl: string | null;
  /** Objet saisi par l'Organisateur, tel quel. */
  subject: string;
  /**
   * Corps HTML déjà sanitizé côté action (allowlist stricte). Peut contenir
   * le placeholder prénom, résolu par destinataire dans l'adapter.
   */
  bodyHtml: string;
  strings: {
    preheader: string;
    dateLabel: string;
    locationLabel: string;
    ctaLabel: string;
    footer: string;
  };
  momentTitle: string;
  momentDate: string;
  momentDateMonth: string;
  momentDateDay: string;
  momentLocation: string | null;
  momentSlug: string;
  appUrl: string;
};

export type HostMomentCreatedEmailData = {
  to: string;
  hostName: string;
  momentTitle: string;
  momentSlug: string;
  circleSlug: string;
  momentDate: string;
  momentDateMonth: string;
  momentDateDay: string;
  locationText: string;
  circleName: string;
  icsContent?: string;
  strings: {
    subject: string;
    heading: string;
    statusMessage: string;
    dateLabel: string;
    locationLabel: string;
    manageMomentCta: string;
    footer: string;
  };
};

export type CircleInvitationEmailData = {
  to: string;
  inviterName: string;
  circleName: string;
  circleDescription: string;
  circleSlug?: string;
  coverImageUrl?: string | null;
  memberCount?: number;
  momentCount?: number;
  circleUrl: string;
  strings: {
    subject: string;
    ctaLabel: string;
    footer: string;
  };
};

export type CircleInvitationsBatchEmailData = Omit<CircleInvitationEmailData, "to"> & {
  recipients: string[];
};

export type MomentHostMessagesBatchEmailData = Omit<MomentHostMessageEmailData, "to"> & {
  recipients: Array<{ to: string; firstName: string | null }>;
};

export type NewMomentMembersEmailData = Omit<NewMomentMemberEmailData, "to" | "recipientName"> & {
  recipients: Array<{ to: string; recipientName: string }>;
};

export type MomentUpdateBatchEmailData = Omit<MomentUpdateEmailData, "to" | "playerName"> & {
  recipients: Array<{ to: string; playerName: string }>;
};

export type MomentCancelledBatchEmailData = Omit<MomentCancelledEmailData, "to" | "recipientName"> & {
  recipients: Array<{ to: string; recipientName: string }>;
};

export type NewCommentBatchEmailData = Omit<NewCommentEmailData, "to" | "recipientName"> & {
  recipients: Array<{ to: string; recipientName: string }>;
};

export type AdminEntityCreatedEmailData = {
  to: string;
  entityType: "circle" | "moment";
  entityName: string;
  creatorName: string;
  creatorEmail: string;
  circleName?: string; // Pour les moments : nom de la Communauté
  entityUrl: string;
  // Pour les moments uniquement : date pré-formatée + lieu lisible
  momentDate?: string;
  locationText?: string;
  strings: {
    subject: string;
    heading: string;
    message: string;
    ctaLabel: string;
    footer: string;
    dateLabel?: string;
    locationLabel?: string;
  };
};

export type AdminMomentUpdatedEmailData = {
  to: string;
  momentTitle: string;
  circleName: string;
  hostName: string;
  hostEmail: string;
  momentUrl: string;
  momentDate: string;
  locationText: string;
  // Liste lisible des champs modifiés (ex: ["Date", "Lieu", "Capacité"])
  changedFields: string[];
  strings: {
    subject: string;
    heading: string;
    message: string;
    changesLabel: string;
    dateLabel: string;
    locationLabel: string;
    ctaLabel: string;
    footer: string;
  };
};

export type HostNewCircleMemberEmailData = {
  to: string;
  hostName: string;
  playerName: string;
  circleName: string;
  circleSlug: string;
  memberCount: number;
  strings: {
    subject: string;
    heading: string;
    message: string;
    memberCountInfo: string;
    manageMembersCta: string;
    footer: string;
  };
};

export type RegistrationReminderEmailData = {
  to: string;
  playerName: string;
  momentTitle: string;
  momentSlug: string;
  momentDate: string; // Pré-formaté
  momentDateMonth: string; // Ex : "MAR"
  momentDateDay: string; // Ex : "16"
  locationText: string;
  circleName: string;
  circleSlug: string;
  icsContent?: string; // Pièce jointe .ics
  strings: {
    subject: string;
    heading: string;
    dateLabel: string;
    locationLabel: string;
    viewMomentCta: string;
    footer: string;
  };
};

export type RegistrationRemovedByHostEmailData = {
  to: string;
  playerName: string;
  momentTitle: string;
  momentSlug: string;
  momentDate: string;
  momentDateMonth: string;
  momentDateDay: string;
  locationText: string;
  circleName: string;
  circleSlug: string;
  strings: {
    subject: string;
    heading: string;
    message: string;
    ctaLabel: string;
    footer: string;
  };
};

export type MemberRemovedFromCircleEmailData = {
  to: string;
  memberName: string;
  circleName: string;
  cancelledRegistrations: number;
  strings: {
    subject: string;
    heading: string;
    message: string;
    cancelledRegistrationsMessage?: string;
    ctaLabel: string;
    footer: string;
  };
};

export type AdminNewUserEmailData = {
  to: string;
  userName: string;
  userEmail: string;
  registeredAt: string; // Date pré-formatée
  adminUsersUrl: string;
  strings: {
    subject: string;
    heading: string;
    message: string;
    ctaLabel: string;
    footer: string;
  };
};

// --- Approval notification types ---

export type ApprovalNotificationEmailData = {
  to: string;
  recipientName: string;
  entityName: string;
  entitySlug: string;
  strings: {
    subject: string;
    heading: string;
    message: string;
    ctaLabel: string;
    footer: string;
  };
};

// --- Onboarding welcome ---

export type OnboardingWelcomeEmailData = {
  to: string;
  firstName: string | null;
};

// --- Contact organizers (issue #425) ---

export type HostContactMessageEmailData = {
  to: string;
  replyTo: string;
  recipientName: string;
  /**
   * Source du contact, déjà formée et localisée :
   * « À propos de l'événement « X » · Communauté Y » ou « À propos de la Communauté « X » ».
   */
  aboutLine: string;
  message: string;
  /** URL de base de l'app, utilisée pour charger le logo dans l'email. */
  appUrl: string;
  /** Strings i18n entièrement résolus côté usecase (pas de placeholders restants). */
  strings: {
    subject: string;
    heading: string;
    intro: string;
    messageLabel: string;
    replyHint: string;
    footer: string;
  };
};

// --- Co-host role changes (D19) ---

export type CoHostPromotedEmailData = {
  to: string;
  recipientName: string;
  inviterName: string;
  circleName: string;
  circleSlug: string;
  circleCoverImage: string | null;
  strings: {
    subject: string;
    heading: string;
    intro: string;
    rightsTitle: string;
    rightCreateEvents: string;
    rightManageRegistrations: string;
    rightUpdateCircle: string;
    rightBroadcast: string;
    rightReceiveNotifications: string;
    limitsNote: string;
    ctaLabel: string;
    footer: string;
    leaveLink: string;
  };
};

export type CoHostDemotedEmailData = {
  to: string;
  recipientName: string;
  circleName: string;
  circleSlug: string;
  circleCoverImage: string | null;
  strings: {
    subject: string;
    heading: string;
    intro: string;
    newRoleLabel: string;
    registrationsNote: string;
    ctaLabel: string;
    footer: string;
    preferencesLink: string;
  };
};

// --- Port interface ---

export interface EmailService {
  sendRegistrationConfirmation(
    data: RegistrationConfirmationEmailData
  ): Promise<void>;
  sendWaitlistPromotion(data: WaitlistPromotionEmailData): Promise<void>;
  sendHostNewRegistration(data: HostNewRegistrationEmailData): Promise<void>;
  sendNewCommentBatch(data: NewCommentBatchEmailData): Promise<void>;
  sendNewMomentToMember(data: NewMomentMemberEmailData): Promise<void>;
  sendNewMomentToMembers(data: NewMomentMembersEmailData): Promise<void>;
  sendMomentUpdate(data: MomentUpdateEmailData): Promise<void>;
  sendMomentUpdateBatch(data: MomentUpdateBatchEmailData): Promise<void>;
  sendMomentCancelled(data: MomentCancelledEmailData): Promise<void>;
  sendMomentCancelledBatch(data: MomentCancelledBatchEmailData): Promise<void>;
  sendHostMomentCreated(data: HostMomentCreatedEmailData): Promise<void>;
  sendMomentHostMessages(data: MomentHostMessagesBatchEmailData): Promise<void>;
  sendAdminEntityCreated(data: AdminEntityCreatedEmailData): Promise<void>;
  sendAdminMomentUpdated(data: AdminMomentUpdatedEmailData): Promise<void>;
  sendCircleInvitation(data: CircleInvitationEmailData): Promise<void>;
  sendCircleInvitations(data: CircleInvitationsBatchEmailData): Promise<void>;
  sendAdminNewUser(data: AdminNewUserEmailData): Promise<void>;
  sendHostNewCircleMember(data: HostNewCircleMemberEmailData): Promise<void>;
  sendRegistrationReminderBatch(data: RegistrationReminderEmailData[]): Promise<void>;
  sendMemberRemovedFromCircle(data: MemberRemovedFromCircleEmailData): Promise<void>;
  sendRegistrationRemovedByHost(data: RegistrationRemovedByHostEmailData): Promise<void>;
  sendApprovalNotification(data: ApprovalNotificationEmailData): Promise<void>;
  sendHostPaidCancellation(data: HostPaidCancellationEmailData): Promise<void>;
  sendOnboardingWelcome(data: OnboardingWelcomeEmailData): Promise<void>;
  sendCoHostPromoted(data: CoHostPromotedEmailData): Promise<void>;
  sendCoHostDemoted(data: CoHostDemotedEmailData): Promise<void>;
  sendHostContactMessage(data: HostContactMessageEmailData): Promise<void>;
}
