import type { CircleNetworkRepository, UpdateCircleNetworkInput } from "@/domain/ports/repositories/circle-network-repository";
import type { CircleNetwork } from "@/domain/models/circle-network";
import type { UserRole } from "@/domain/models/user";
import { AdminUnauthorizedError } from "@/domain/errors";

type Deps = { circleNetworkRepository: CircleNetworkRepository };

export async function adminUpdateNetwork(
  callerRole: UserRole,
  networkId: string,
  input: UpdateCircleNetworkInput,
  deps: Deps
): Promise<CircleNetwork> {
  if (callerRole !== "ADMIN") {
    throw new AdminUnauthorizedError();
  }
  return deps.circleNetworkRepository.update(networkId, input);
}
