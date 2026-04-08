import type { PublicCircle } from "@/domain/ports/repositories/circle-repository";
import type { CoverImageAttribution } from "@/domain/models/circle";

export type CircleNetwork = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  coverImage: string | null;
  coverImageAttribution: CoverImageAttribution | null;
  website: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CircleNetworkWithCircles = CircleNetwork & {
  circles: PublicCircle[];
};
