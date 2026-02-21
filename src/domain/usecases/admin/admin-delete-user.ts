import type { AdminRepository } from "@/domain/ports/repositories/admin-repository";

type Deps = { adminRepository: AdminRepository };

export async function adminDeleteUser(
  userId: string,
  deps: Deps
): Promise<void> {
  await deps.adminRepository.deleteUser(userId);
}
