import type { LocationType } from "@/domain/models/moment";

export type RegistrationStatus =
  | "REGISTERED"
  | "WAITLISTED"
  | "CANCELLED"
  | "CHECKED_IN";

export type PaymentStatus = "NONE" | "PENDING" | "PAID" | "REFUNDED";

export type Registration = {
  id: string;
  momentId: string;
  userId: string;
  status: RegistrationStatus;
  paymentStatus: PaymentStatus;
  stripePaymentIntentId: string | null;
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
  };
};

export type RegistrationWithMoment = Registration & {
  moment: {
    id: string;
    slug: string;
    title: string;
    startsAt: Date;
    endsAt: Date | null;
    locationType: LocationType;
    locationName: string | null;
    circleName: string;
    circleSlug: string;
  };
};
