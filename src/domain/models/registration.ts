import type { LocationType, MomentStatus } from "@/domain/models/moment";
import type { UserAvatarInfo } from "@/domain/models/user";

export type RegistrationStatus =
  | "PENDING_APPROVAL"
  | "REGISTERED"
  | "WAITLISTED"
  | "CANCELLED"
  | "CHECKED_IN"
  | "REJECTED";

export type PaymentStatus = "NONE" | "PENDING" | "PAID" | "REFUNDED";

/**
 * Une inscription « confirmée » : l'utilisateur participe déjà (`REGISTERED`) ou
 * a été pointé (`CHECKED_IN`). Source unique pour décider si un organisateur doit
 * être (ré)inscrit à un événement : tout autre statut (`WAITLISTED`,
 * `PENDING_APPROVAL`, `CANCELLED`, `REJECTED`) doit être forcé à `REGISTERED`.
 * Voir spec/features/co-host-event-participation.md.
 */
export function isConfirmedParticipation(status: RegistrationStatus): boolean {
  return status === "REGISTERED" || status === "CHECKED_IN";
}

/** Audience d'un message Organisateur → Participants d'un Moment. */
export type HostMessageSegment = "REGISTERED" | "WAITLISTED" | "ALL";

/** Limites du message Organisateur — source unique pour client, action et usecase. */
export const HOST_MESSAGE_SUBJECT_MAX_LENGTH = 150;
export const HOST_MESSAGE_BODY_MAX_TEXT_LENGTH = 5000;

export type Registration = {
  id: string;
  momentId: string;
  userId: string;
  status: RegistrationStatus;
  paymentStatus: PaymentStatus;
  stripePaymentIntentId: string | null;
  stripeReceiptUrl: string | null;
  registeredAt: Date;
  cancelledAt: Date | null;
  checkedInAt: Date | null;
};

export type RegistrationWithUser = Registration & {
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    image: string | null;
    publicId: string | null;
    website?: string | null;
    linkedinUrl?: string | null;
    twitterUrl?: string | null;
    githubUrl?: string | null;
  };
};

export type RegistrationMomentAttendee = { user: UserAvatarInfo };

export type RegistrationWithMoment = Registration & {
  moment: {
    id: string;
    slug: string;
    title: string;
    coverImage: string | null;
    startsAt: Date;
    endsAt: Date | null;
    status: MomentStatus;
    locationType: LocationType;
    locationName: string | null;
    circleName: string;
    circleSlug: string;
    circleCoverImage: string | null;
    registrationCount: number;
    topAttendees: RegistrationMomentAttendee[];
  };
};
