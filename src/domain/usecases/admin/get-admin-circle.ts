import type {
  AdminRepository,
  AdminCircleDetail,
} from "@/domain/ports/repositories/admin-repository";

type Deps = { adminRepository: AdminRepository };

export async function getAdminCircle(
  circleId: string,
  deps: Deps
): Promise<AdminCircleDetail | null> {
  return deps.adminRepository.findCircleById(circleId);
}
