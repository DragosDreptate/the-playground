import type { CircleNetworkRepository } from "@/domain/ports/repositories/circle-network-repository";
import type { CircleNetworkWithCircles } from "@/domain/models/circle-network";

type Deps = { circleNetworkRepository: CircleNetworkRepository };

export async function getNetworkBySlug(
  slug: string,
  deps: Deps
): Promise<CircleNetworkWithCircles | null> {
  return deps.circleNetworkRepository.findBySlug(slug);
}
