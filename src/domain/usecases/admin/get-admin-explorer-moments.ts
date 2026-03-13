import type { UserRole } from "@/domain/models/user";
import type {
  AdminRepository,
  AdminExplorerMomentFilters,
  AdminExplorerMomentRow,
} from "@/domain/ports/repositories/admin-repository";
import { AdminUnauthorizedError } from "@/domain/errors";

type Deps = { adminRepository: AdminRepository };

export async function getAdminExplorerMoments(
  callerRole: UserRole,
  filters: AdminExplorerMomentFilters,
  deps: Deps
): Promise<{ moments: AdminExplorerMomentRow[]; total: number }> {
  if (callerRole !== "ADMIN") throw new AdminUnauthorizedError();
  const [moments, total] = await Promise.all([
    deps.adminRepository.findAllExplorerMoments(filters),
    deps.adminRepository.countExplorerMoments(filters),
  ]);
  return { moments, total };
}
