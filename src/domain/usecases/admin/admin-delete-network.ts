import type { CircleNetworkRepository } from "@/domain/ports/repositories/circle-network-repository";
import type { UserRole } from "@/domain/models/user";
import { AdminUnauthorizedError } from "@/domain/errors";

type Deps = { circleNetworkRepository: CircleNetworkRepository };

export async function adminDeleteNetwork(
  callerRole: UserRole,
  networkId: string,
  deps: Deps
): Promise<void> {
  if (callerRole !== "ADMIN") {
    throw new AdminUnauthorizedError();
  }
  await deps.circleNetworkRepository.delete(networkId);
}
