import type { CircleVenue } from "@/domain/models/circle-venue";

export type CreateCircleVenueInput = {
  circleId: string;
  name: string;
  address: string;
};

export type UpdateCircleVenueInput = {
  name?: string;
  address?: string;
};

export interface CircleVenueRepository {
  create(input: CreateCircleVenueInput): Promise<CircleVenue>;
  findById(id: string): Promise<CircleVenue | null>;
  findByCircleId(circleId: string): Promise<CircleVenue[]>;
  update(id: string, input: UpdateCircleVenueInput): Promise<CircleVenue>;
  delete(id: string): Promise<void>;
}
