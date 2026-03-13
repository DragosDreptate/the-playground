import type { UserRole } from "@/domain/models/user";
import type { AdminRepository } from "@/domain/ports/repositories/admin-repository";
import { AdminUnauthorizedError } from "@/domain/errors";

type Deps = { adminRepository: AdminRepository };

export async function adminUpdateCircleExcluded(
  callerRole: UserRole,
  circleId: string,
  excluded: boolean,
  deps: Deps
): Promise<void> {
  if (callerRole !== "ADMIN") throw new AdminUnauthorizedError();
  await deps.adminRepository.updateCircleExcluded(circleId, excluded);
}
