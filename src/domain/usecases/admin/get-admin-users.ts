import type {
  AdminRepository,
  AdminUserFilters,
  AdminUserRow,
} from "@/domain/ports/repositories/admin-repository";
import type { UserRole } from "@/domain/models/user";
import { AdminUnauthorizedError } from "@/domain/errors";

type Deps = { adminRepository: AdminRepository };

export type GetAdminUsersResult = {
  users: AdminUserRow[];
  total: number;
};

export async function getAdminUsers(
  callerRole: UserRole,
  filters: AdminUserFilters,
  deps: Deps
): Promise<GetAdminUsersResult> {
  if (callerRole !== "ADMIN") {
    throw new AdminUnauthorizedError();
  }
  const [users, total] = await Promise.all([
    deps.adminRepository.findAllUsers(filters),
    deps.adminRepository.countUsers(filters),
  ]);
  return { users, total };
}
