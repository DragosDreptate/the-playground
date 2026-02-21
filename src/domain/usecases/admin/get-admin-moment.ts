import type {
  AdminRepository,
  AdminMomentDetail,
} from "@/domain/ports/repositories/admin-repository";

type Deps = { adminRepository: AdminRepository };

export async function getAdminMoment(
  momentId: string,
  deps: Deps
): Promise<AdminMomentDetail | null> {
  return deps.adminRepository.findMomentById(momentId);
}
