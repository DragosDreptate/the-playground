import type { LocationType } from "@/domain/models/moment";
import type { UserAvatarInfo } from "@/domain/models/user";

export type RegistrationStatus =
  | "PENDING_APPROVAL"
  | "REGISTERED"
  | "WAITLISTED"
  | "CANCELLED"
  | "CHECKED_IN"
  | "REJECTED";

export type PaymentStatus = "NONE" | "PENDING" | "PAID" | "REFUNDED";

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
    locationType: LocationType;
    locationName: string | null;
    circleName: string;
    circleSlug: string;
    circleCoverImage: string | null;
    registrationCount: number;
    topAttendees: RegistrationMomentAttendee[];
  };
};
