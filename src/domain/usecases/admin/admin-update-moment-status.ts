import type { AdminRepository } from "@/domain/ports/repositories/admin-repository";
import type { MomentStatus } from "@/domain/models/moment";
import type { UserRole } from "@/domain/models/user";
import { AdminUnauthorizedError } from "@/domain/errors";

type Deps = { adminRepository: AdminRepository };

export async function adminUpdateMomentStatus(
  callerRole: UserRole,
  momentId: string,
  status: MomentStatus,
  deps: Deps
): Promise<void> {
  if (callerRole !== "ADMIN") {
    throw new AdminUnauthorizedError();
  }
  await deps.adminRepository.updateMomentStatus(momentId, status);
}
