import type { AdminRepository } from "@/domain/ports/repositories/admin-repository";
import type { UserRole } from "@/domain/models/user";
import { AdminUnauthorizedError } from "@/domain/errors";

type Deps = { adminRepository: AdminRepository };

export async function adminDeleteUser(
  callerRole: UserRole,
  userId: string,
  deps: Deps
): Promise<void> {
  if (callerRole !== "ADMIN") {
    throw new AdminUnauthorizedError();
  }
  await deps.adminRepository.deleteUser(userId);
}
