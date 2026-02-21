import type {
  AdminRepository,
  AdminCircleFilters,
  AdminCircleRow,
} from "@/domain/ports/repositories/admin-repository";
import type { UserRole } from "@/domain/models/user";
import { AdminUnauthorizedError } from "@/domain/errors";

type Deps = { adminRepository: AdminRepository };

export type GetAdminCirclesResult = {
  circles: AdminCircleRow[];
  total: number;
};

export async function getAdminCircles(
  callerRole: UserRole,
  filters: AdminCircleFilters,
  deps: Deps
): Promise<GetAdminCirclesResult> {
  if (callerRole !== "ADMIN") {
    throw new AdminUnauthorizedError();
  }
  const [circles, total] = await Promise.all([
    deps.adminRepository.findAllCircles(filters),
    deps.adminRepository.countCircles(filters),
  ]);
  return { circles, total };
}
