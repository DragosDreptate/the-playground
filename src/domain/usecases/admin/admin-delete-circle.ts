import type { AdminRepository } from "@/domain/ports/repositories/admin-repository";

type Deps = { adminRepository: AdminRepository };

export async function adminDeleteCircle(
  circleId: string,
  deps: Deps
): Promise<void> {
  await deps.adminRepository.deleteCircle(circleId);
}
