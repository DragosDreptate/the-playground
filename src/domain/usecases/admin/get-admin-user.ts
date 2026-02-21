import type {
  AdminRepository,
  AdminUserDetail,
} from "@/domain/ports/repositories/admin-repository";
import type { UserRole } from "@/domain/models/user";
import { AdminUnauthorizedError } from "@/domain/errors";

type Deps = { adminRepository: AdminRepository };

export async function getAdminUser(
  callerRole: UserRole,
  userId: string,
  deps: Deps
): Promise<AdminUserDetail | null> {
  if (callerRole !== "ADMIN") {
    throw new AdminUnauthorizedError();
  }
  return deps.adminRepository.findUserById(userId);
}
