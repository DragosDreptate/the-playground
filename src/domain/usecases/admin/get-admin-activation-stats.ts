import type { UserRole } from "@/domain/models/user";
import type { AdminRepository, AdminActivationStats } from "@/domain/ports/repositories/admin-repository";
import { AdminUnauthorizedError } from "@/domain/errors/admin-errors";

type Deps = { adminRepository: AdminRepository };

export async function getAdminActivationStats(
  callerRole: UserRole,
  deps: Deps
): Promise<AdminActivationStats> {
  if (callerRole !== "ADMIN") throw new AdminUnauthorizedError();
  return deps.adminRepository.getActivationStats();
}
