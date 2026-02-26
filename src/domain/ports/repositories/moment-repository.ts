import type { Moment, LocationType, MomentStatus, CoverImageAttribution } from "@/domain/models/moment";
import type { CircleCategory } from "@/domain/models/circle";

export type CreateMomentInput = {
  slug: string;
  circleId: string;
  createdById: string;
  title: string;
  description: string;
  coverImage?: string | null;
  coverImageAttribution?: CoverImageAttribution | null;
  startsAt: Date;
  endsAt: Date | null;
  locationType: LocationType;
  locationName: string | null;
  locationAddress: string | null;
  videoLink: string | null;
  capacity: number | null;
  price: number;
  currency: string;
  status: MomentStatus;
};

export type UpdateMomentInput = {
  title?: string;
  description?: string;
  coverImage?: string | null;
  coverImageAttribution?: CoverImageAttribution | null;
  startsAt?: Date;
  endsAt?: Date | null;
  locationType?: LocationType;
  locationName?: string | null;
  locationAddress?: string | null;
  videoLink?: string | null;
  capacity?: number | null;
  price?: number;
  currency?: string;
  status?: MomentStatus;
};

export type PublicMomentFilters = {
  category?: CircleCategory;
  limit?: number;
  offset?: number;
};

export type PublicMoment = {
  id: string;
  slug: string;
  title: string;
  coverImage: string | null;
  startsAt: Date;
  endsAt: Date | null;
  locationType: LocationType;
  locationName: string | null;
  registrationCount: number;
  capacity: number | null;
  circle: {
    slug: string;
    name: string;
    category: CircleCategory | null;
    city: string | null;
  };
};

export type UpcomingCircleMoment = {
  id: string;
  slug: string;
  title: string;
  coverImage: string | null;
  startsAt: Date;
  locationType: LocationType;
  locationName: string | null;
  registrationCount: number;
};

export interface MomentRepository {
  create(input: CreateMomentInput): Promise<Moment>;
  findById(id: string): Promise<Moment | null>;
  findBySlug(slug: string): Promise<Moment | null>;
  findByCircleId(circleId: string): Promise<Moment[]>;
  update(id: string, input: UpdateMomentInput): Promise<Moment>;
  delete(id: string): Promise<void>;
  slugExists(slug: string): Promise<boolean>;
  /** Transition PUBLISHED → PAST for Moments whose end time (or start time) has passed. */
  transitionPastMoments(): Promise<number>;
  findPublicUpcoming(filters: PublicMomentFilters): Promise<PublicMoment[]>;
  findUpcomingByCircleId(circleId: string, excludeMomentId: string, limit: number): Promise<UpcomingCircleMoment[]>;
}
