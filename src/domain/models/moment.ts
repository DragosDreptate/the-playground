export type LocationType = "IN_PERSON" | "ONLINE" | "HYBRID";

export type MomentStatus = "PUBLISHED" | "CANCELLED" | "PAST";

export type Moment = {
  id: string;
  slug: string;
  circleId: string;
  createdById: string;
  title: string;
  description: string;
  startsAt: Date;
  endsAt: Date | null;
  locationType: LocationType;
  locationName: string | null;
  locationAddress: string | null;
  videoLink: string | null;
  capacity: number | null;
  price: number; // In cents. 0 = free. Stripe convention.
  currency: string;
  status: MomentStatus;
  createdAt: Date;
  updatedAt: Date;
};
