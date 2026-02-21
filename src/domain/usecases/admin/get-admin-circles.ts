import type {
  AdminRepository,
  AdminCircleFilters,
  AdminCircleRow,
} from "@/domain/ports/repositories/admin-repository";

type Deps = { adminRepository: AdminRepository };

export type GetAdminCirclesResult = {
  circles: AdminCircleRow[];
  total: number;
};

export async function getAdminCircles(
  filters: AdminCircleFilters,
  deps: Deps
): Promise<GetAdminCirclesResult> {
  const [circles, total] = await Promise.all([
    deps.adminRepository.findAllCircles(filters),
    deps.adminRepository.countCircles(filters),
  ]);
  return { circles, total };
}
