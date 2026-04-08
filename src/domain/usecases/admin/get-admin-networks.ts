import type { CircleNetworkRepository, CircleNetworkWithCount } from "@/domain/ports/repositories/circle-network-repository";
import type { UserRole } from "@/domain/models/user";
import { AdminUnauthorizedError } from "@/domain/errors";

type Deps = { circleNetworkRepository: CircleNetworkRepository };

export async function getAdminNetworks(
  callerRole: UserRole,
  deps: Deps
): Promise<CircleNetworkWithCount[]> {
  if (callerRole !== "ADMIN") {
    throw new AdminUnauthorizedError();
  }
  return deps.circleNetworkRepository.findAll();
}
