import type { UserRole } from "@/domain/models/user";
import type { AdminRepository, AdminTimeSeries } from "@/domain/ports/repositories/admin-repository";
import { AdminUnauthorizedError } from "@/domain/errors/admin-errors";

type Deps = { adminRepository: AdminRepository };

export async function getAdminTimeSeries(
  callerRole: UserRole,
  days: number,
  deps: Deps
): Promise<AdminTimeSeries> {
  if (callerRole !== "ADMIN") throw new AdminUnauthorizedError();
  return deps.adminRepository.getTimeSeries(days);
}
