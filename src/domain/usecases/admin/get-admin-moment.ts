import type {
  AdminRepository,
  AdminMomentDetail,
} from "@/domain/ports/repositories/admin-repository";
import type { UserRole } from "@/domain/models/user";
import { AdminUnauthorizedError } from "@/domain/errors";

type Deps = { adminRepository: AdminRepository };

export async function getAdminMoment(
  callerRole: UserRole,
  momentId: string,
  deps: Deps
): Promise<AdminMomentDetail | null> {
  if (callerRole !== "ADMIN") {
    throw new AdminUnauthorizedError();
  }
  return deps.adminRepository.findMomentById(momentId);
}
