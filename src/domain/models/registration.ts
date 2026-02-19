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
