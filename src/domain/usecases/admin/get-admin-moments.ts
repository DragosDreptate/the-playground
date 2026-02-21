import type {
  AdminRepository,
  AdminMomentFilters,
  AdminMomentRow,
} from "@/domain/ports/repositories/admin-repository";
import type { UserRole } from "@/domain/models/user";
import { AdminUnauthorizedError } from "@/domain/errors";

type Deps = { adminRepository: AdminRepository };

export type GetAdminMomentsResult = {
  moments: AdminMomentRow[];
  total: number;
};

export async function getAdminMoments(
  callerRole: UserRole,
  filters: AdminMomentFilters,
  deps: Deps
): Promise<GetAdminMomentsResult> {
  if (callerRole !== "ADMIN") {
    throw new AdminUnauthorizedError();
  }
  const [moments, total] = await Promise.all([
    deps.adminRepository.findAllMoments(filters),
    deps.adminRepository.countMoments(filters),
  ]);
  return { moments, total };
}
