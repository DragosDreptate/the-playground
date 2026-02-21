import type {
  AdminRepository,
  AdminMomentFilters,
  AdminMomentRow,
} from "@/domain/ports/repositories/admin-repository";

type Deps = { adminRepository: AdminRepository };

export type GetAdminMomentsResult = {
  moments: AdminMomentRow[];
  total: number;
};

export async function getAdminMoments(
  filters: AdminMomentFilters,
  deps: Deps
): Promise<GetAdminMomentsResult> {
  const [moments, total] = await Promise.all([
    deps.adminRepository.findAllMoments(filters),
    deps.adminRepository.countMoments(filters),
  ]);
  return { moments, total };
}
