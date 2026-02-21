import type { AdminRepository } from "@/domain/ports/repositories/admin-repository";

type Deps = { adminRepository: AdminRepository };

export async function adminDeleteMoment(
  momentId: string,
  deps: Deps
): Promise<void> {
  await deps.adminRepository.deleteMoment(momentId);
}
