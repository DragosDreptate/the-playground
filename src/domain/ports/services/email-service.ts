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

export type HostNewCommentEmailData = {
  to: string;
  hostName: string;
  playerName: string;
  momentTitle: string;
  momentSlug: string;
  circleSlug: string;
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
  ctaLabel: string;
  unsubscribeText: string;
  unsubscribeLabel: string;
};

export type NewMomentFollowerEmailData = {
  to: string;
  recipientName: string;
  circleName: string;
  circleSlug: string;
  momentTitle: string;
  momentSlug: string;
  momentDate: string;
  momentLocation: string;
  strings: NewMomentNotificationStrings;
};

export type NewMomentMemberEmailData = NewMomentFollowerEmailData;

export type HostNewFollowerEmailData = {
  to: string;
  hostName: string;
  followerName: string;
  circleName: string;
  circleSlug: string;
  strings: {
    subject: string;
    heading: string;
    message: string;
    viewMembersCta: string;
    footer: string;
  };
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

// --- Port interface ---

export interface EmailService {
  sendRegistrationConfirmation(
    data: RegistrationConfirmationEmailData
  ): Promise<void>;
  sendWaitlistPromotion(data: WaitlistPromotionEmailData): Promise<void>;
  sendHostNewRegistration(data: HostNewRegistrationEmailData): Promise<void>;
  sendHostNewComment(data: HostNewCommentEmailData): Promise<void>;
  sendNewMomentToFollower(data: NewMomentFollowerEmailData): Promise<void>;
  sendNewMomentToMember(data: NewMomentMemberEmailData): Promise<void>;
  sendHostNewFollower(data: HostNewFollowerEmailData): Promise<void>;
  sendMomentUpdate(data: MomentUpdateEmailData): Promise<void>;
  sendMomentCancelled(data: MomentCancelledEmailData): Promise<void>;
  sendHostMomentCreated(data: HostMomentCreatedEmailData): Promise<void>;
}
