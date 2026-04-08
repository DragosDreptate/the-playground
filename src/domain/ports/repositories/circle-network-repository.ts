import type {
  CircleNetwork,
  CircleNetworkWithCircles,
} from "@/domain/models/circle-network";
import type { CircleCategory } from "@/domain/models/circle";

export type CreateCircleNetworkInput = {
  slug: string;
  name: string;
  description?: string;
  coverImage?: string;
  website?: string;
};

export type UpdateCircleNetworkInput = Partial<CreateCircleNetworkInput>;

export type CircleNetworkWithCount = CircleNetwork & { circleCount: number };

export type NetworkCircleSearchResult = {
  id: string;
  name: string;
  slug: string;
  category: CircleCategory | null;
  city: string | null;
  visibility: "PUBLIC" | "PRIVATE";
};

export interface CircleNetworkRepository {
  // Lecture publique
  findBySlug(slug: string): Promise<CircleNetworkWithCircles | null>;

  // Lecture pour badge sur page Communauté
  findNetworksByCircleId(circleId: string): Promise<CircleNetwork[]>;

  // Admin CRUD
  findAll(): Promise<CircleNetworkWithCount[]>;
  findById(id: string): Promise<CircleNetworkWithCircles | null>;
  create(input: CreateCircleNetworkInput): Promise<CircleNetwork>;
  update(id: string, input: UpdateCircleNetworkInput): Promise<CircleNetwork>;
  delete(id: string): Promise<void>;

  // Admin gestion composition
  addCircle(networkId: string, circleId: string): Promise<void>;
  removeCircle(networkId: string, circleId: string): Promise<void>;

  // Admin recherche de Circles (exclut ceux déjà membres du Réseau)
  searchCirclesNotInNetwork(
    networkId: string,
    query: string
  ): Promise<NetworkCircleSearchResult[]>;
}
