import type { CircleNetworkRepository } from "@/domain/ports/repositories/circle-network-repository";
import type { CircleNetworkWithCircles } from "@/domain/models/circle-network";
import type { UserRole } from "@/domain/models/user";
import { AdminUnauthorizedError } from "@/domain/errors";

type Deps = { circleNetworkRepository: CircleNetworkRepository };

export async function getAdminNetwork(
  callerRole: UserRole,
  networkId: string,
  deps: Deps
): Promise<CircleNetworkWithCircles | null> {
  if (callerRole !== "ADMIN") {
    throw new AdminUnauthorizedError();
  }
  return deps.circleNetworkRepository.findById(networkId);
}
