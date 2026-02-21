import type {
  AdminRepository,
  AdminUserDetail,
} from "@/domain/ports/repositories/admin-repository";

type Deps = { adminRepository: AdminRepository };

export async function getAdminUser(
  userId: string,
  deps: Deps
): Promise<AdminUserDetail | null> {
  return deps.adminRepository.findUserById(userId);
}
