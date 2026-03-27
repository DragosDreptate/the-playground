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

export type BroadcastMomentEmailData = {
  to: string;
  strings: {
    subject: string;
    preheader: string;
    heading: string;
    intro: string;
    customMessage?: string;
    dateLabel: string;
    locationLabel: string;
    ctaLabel: string;
    unsubscribeText: string;
    unsubscribeLabel: string;
  };
  momentTitle: string;
  momentDate: string;
  momentDateMonth: string;
  momentDateDay: string;
  momentLocation: string | null;
  circleName: string;
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
  inviteUrl: string;
  strings: {
    subject: string;
    ctaLabel: string;
    footer: string;
  };
};

export type CircleInvitationsBatchEmailData = Omit<CircleInvitationEmailData, "to"> & {
  recipients: string[];
};

export type BroadcastMomentsBatchEmailData = Omit<BroadcastMomentEmailData, "to"> & {
  recipients: string[];
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

export type AdminEntityCreatedEmailData = {
  to: string;
  entityType: "circle" | "moment";
  entityName: string;
  creatorName: string;
  creatorEmail: string;
  circleName?: string; // Pour les moments : nom de la Communauté
  entityUrl: string;
  strings: {
    subject: string;
    heading: string;
    message: string;
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

// --- Port interface ---

export interface EmailService {
  sendRegistrationConfirmation(
    data: RegistrationConfirmationEmailData
  ): Promise<void>;
  sendWaitlistPromotion(data: WaitlistPromotionEmailData): Promise<void>;
  sendHostNewRegistration(data: HostNewRegistrationEmailData): Promise<void>;
  sendNewComment(data: NewCommentEmailData): Promise<void>;
  sendNewMomentToMember(data: NewMomentMemberEmailData): Promise<void>;
  sendNewMomentToMembers(data: NewMomentMembersEmailData): Promise<void>;
  sendMomentUpdate(data: MomentUpdateEmailData): Promise<void>;
  sendMomentUpdateBatch(data: MomentUpdateBatchEmailData): Promise<void>;
  sendMomentCancelled(data: MomentCancelledEmailData): Promise<void>;
  sendMomentCancelledBatch(data: MomentCancelledBatchEmailData): Promise<void>;
  sendHostMomentCreated(data: HostMomentCreatedEmailData): Promise<void>;
  sendBroadcastMoments(data: BroadcastMomentsBatchEmailData): Promise<void>;
  sendAdminEntityCreated(data: AdminEntityCreatedEmailData): Promise<void>;
  sendCircleInvitation(data: CircleInvitationEmailData): Promise<void>;
  sendCircleInvitations(data: CircleInvitationsBatchEmailData): Promise<void>;
  sendAdminNewUser(data: AdminNewUserEmailData): Promise<void>;
  sendHostNewCircleMember(data: HostNewCircleMemberEmailData): Promise<void>;
  sendRegistrationReminderBatch(data: RegistrationReminderEmailData[]): Promise<void>;
  sendMemberRemovedFromCircle(data: MemberRemovedFromCircleEmailData): Promise<void>;
  sendRegistrationRemovedByHost(data: RegistrationRemovedByHostEmailData): Promise<void>;
  sendApprovalNotification(data: ApprovalNotificationEmailData): Promise<void>;
  sendHostPaidCancellation(data: HostPaidCancellationEmailData): Promise<void>;
}
