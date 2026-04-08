import type { CircleNetworkRepository } from "@/domain/ports/repositories/circle-network-repository";
import type { CircleNetwork } from "@/domain/models/circle-network";

type Deps = { circleNetworkRepository: CircleNetworkRepository };

export async function getNetworksByCircleId(
  circleId: string,
  deps: Deps
): Promise<CircleNetwork[]> {
  return deps.circleNetworkRepository.findNetworksByCircleId(circleId);
}
