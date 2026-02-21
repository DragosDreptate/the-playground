import type { AdminRepository, AdminStats } from "@/domain/ports/repositories/admin-repository";

type Deps = { adminRepository: AdminRepository };

export async function getAdminStats(deps: Deps): Promise<AdminStats> {
  return deps.adminRepository.getStats();
}
