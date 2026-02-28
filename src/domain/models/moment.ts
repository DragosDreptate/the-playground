import type { CoverImageAttribution } from "@/domain/models/circle";

export type { CoverImageAttribution };

export type LocationType = "IN_PERSON" | "ONLINE" | "HYBRID";

export type MomentStatus = "PUBLISHED" | "CANCELLED" | "PAST";

export type HostMomentSummary = {
  id: string;
  slug: string;
  title: string;
  coverImage: string | null;
  startsAt: Date;
  endsAt: Date | null;
  locationType: LocationType;
  locationName: string | null;
  status: MomentStatus;
  registrationCount: number;
  circle: {
    slug: string;
    name: string;
    coverImage: string | null;
  };
};

export type Moment = {
  id: string;
  slug: string;
  circleId: string;
  createdById: string | null;
  title: string;
  description: string;
  coverImage: string | null;
  coverImageAttribution: CoverImageAttribution | null;
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
