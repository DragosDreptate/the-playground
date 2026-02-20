import type { Moment, LocationType, MomentStatus } from "@/domain/models/moment";

export type CreateMomentInput = {
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
  price: number;
  currency: string;
  status: MomentStatus;
};

export type UpdateMomentInput = {
  title?: string;
  description?: string;
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
}
