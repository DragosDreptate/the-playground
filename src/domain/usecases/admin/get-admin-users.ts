import type {
  AdminRepository,
  AdminUserFilters,
  AdminUserRow,
} from "@/domain/ports/repositories/admin-repository";

type Deps = { adminRepository: AdminRepository };

export type GetAdminUsersResult = {
  users: AdminUserRow[];
  total: number;
};

export async function getAdminUsers(
  filters: AdminUserFilters,
  deps: Deps
): Promise<GetAdminUsersResult> {
  const [users, total] = await Promise.all([
    deps.adminRepository.findAllUsers(filters),
    deps.adminRepository.countUsers(filters),
  ]);
  return { users, total };
}
