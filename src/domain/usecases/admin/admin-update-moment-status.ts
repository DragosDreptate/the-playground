import type { AdminRepository } from "@/domain/ports/repositories/admin-repository";
import type { MomentStatus } from "@/domain/models/moment";

type Deps = { adminRepository: AdminRepository };

export async function adminUpdateMomentStatus(
  momentId: string,
  status: MomentStatus,
  deps: Deps
): Promise<void> {
  await deps.adminRepository.updateMomentStatus(momentId, status);
}
