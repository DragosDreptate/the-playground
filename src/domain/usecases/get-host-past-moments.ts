import type { HostMomentSummary } from "@/domain/models/moment";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";

type Deps = { momentRepository: MomentRepository };

export async function getHostPastMoments(
  hostUserId: string,
  deps: Deps
): Promise<HostMomentSummary[]> {
  return deps.momentRepository.findPastByHostUserId(hostUserId);
}
