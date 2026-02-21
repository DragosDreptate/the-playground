import type { AdminRepository, AdminStats } from "@/domain/ports/repositories/admin-repository";
import type { UserRole } from "@/domain/models/user";
import { AdminUnauthorizedError } from "@/domain/errors";

type Deps = { adminRepository: AdminRepository };

export async function getAdminStats(callerRole: UserRole, deps: Deps): Promise<AdminStats> {
  if (callerRole !== "ADMIN") {
    throw new AdminUnauthorizedError();
  }
  return deps.adminRepository.getStats();
}
