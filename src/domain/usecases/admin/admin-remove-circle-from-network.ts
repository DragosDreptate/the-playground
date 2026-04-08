import type { CircleNetworkRepository } from "@/domain/ports/repositories/circle-network-repository";
import type { UserRole } from "@/domain/models/user";
import { AdminUnauthorizedError } from "@/domain/errors";

type Deps = { circleNetworkRepository: CircleNetworkRepository };

export async function adminRemoveCircleFromNetwork(
  callerRole: UserRole,
  networkId: string,
  circleId: string,
  deps: Deps
): Promise<void> {
  if (callerRole !== "ADMIN") {
    throw new AdminUnauthorizedError();
  }
  await deps.circleNetworkRepository.removeCircle(networkId, circleId);
}
