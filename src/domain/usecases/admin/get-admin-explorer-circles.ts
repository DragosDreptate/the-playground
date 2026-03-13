import type { UserRole } from "@/domain/models/user";
import type {
  AdminRepository,
  AdminExplorerFilters,
  AdminExplorerCircleRow,
} from "@/domain/ports/repositories/admin-repository";
import { AdminUnauthorizedError } from "@/domain/errors";

type Deps = { adminRepository: AdminRepository };

export async function getAdminExplorerCircles(
  callerRole: UserRole,
  filters: AdminExplorerFilters,
  deps: Deps
): Promise<{ circles: AdminExplorerCircleRow[]; total: number }> {
  if (callerRole !== "ADMIN") throw new AdminUnauthorizedError();
  const [circles, total] = await Promise.all([
    deps.adminRepository.findAllExplorerCircles(filters),
    deps.adminRepository.countExplorerCircles(filters),
  ]);
  return { circles, total };
}
