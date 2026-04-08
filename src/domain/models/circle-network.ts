import type { PublicCircle } from "@/domain/ports/repositories/circle-repository";

export type CircleNetwork = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  coverImage: string | null;
  website: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CircleNetworkWithCircles = CircleNetwork & {
  circles: PublicCircle[];
};
