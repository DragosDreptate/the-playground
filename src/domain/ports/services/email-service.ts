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
  strings: {
    subject: string;
    heading: string;
    statusMessage: string;
    dateLabel: string;
    locationLabel: string;
    viewMomentCta: string;
    cancelLink: string;
    dashboardLink: string;
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
    ctaLabel: string;
    unsubscribeText: string;
    unsubscribeLabel: string;
  };
  momentTitle: string;
  momentDate: string;
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

// --- Port interface ---

export interface EmailService {
  sendRegistrationConfirmation(
    data: RegistrationConfirmationEmailData
  ): Promise<void>;
  sendWaitlistPromotion(data: WaitlistPromotionEmailData): Promise<void>;
  sendHostNewRegistration(data: HostNewRegistrationEmailData): Promise<void>;
  sendNewComment(data: NewCommentEmailData): Promise<void>;
  sendNewMomentToMember(data: NewMomentMemberEmailData): Promise<void>;
  sendMomentUpdate(data: MomentUpdateEmailData): Promise<void>;
  sendMomentCancelled(data: MomentCancelledEmailData): Promise<void>;
  sendHostMomentCreated(data: HostMomentCreatedEmailData): Promise<void>;
  sendBroadcastMoments(data: BroadcastMomentsBatchEmailData): Promise<void>;
  sendAdminEntityCreated(data: AdminEntityCreatedEmailData): Promise<void>;
  sendCircleInvitation(data: CircleInvitationEmailData): Promise<void>;
  sendCircleInvitations(data: CircleInvitationsBatchEmailData): Promise<void>;
  sendAdminNewUser(data: AdminNewUserEmailData): Promise<void>;
  sendHostNewCircleMember(data: HostNewCircleMemberEmailData): Promise<void>;
}
