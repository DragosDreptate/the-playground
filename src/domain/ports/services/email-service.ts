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

// --- Port interface ---

export interface EmailService {
  sendRegistrationConfirmation(
    data: RegistrationConfirmationEmailData
  ): Promise<void>;
  sendWaitlistPromotion(data: WaitlistPromotionEmailData): Promise<void>;
  sendHostNewRegistration(data: HostNewRegistrationEmailData): Promise<void>;
}
