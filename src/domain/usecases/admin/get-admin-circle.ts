import type {
  AdminRepository,
  AdminCircleDetail,
} from "@/domain/ports/repositories/admin-repository";
import type { UserRole } from "@/domain/models/user";
import { AdminUnauthorizedError } from "@/domain/errors";

type Deps = { adminRepository: AdminRepository };

export async function getAdminCircle(
  callerRole: UserRole,
  circleId: string,
  deps: Deps
): Promise<AdminCircleDetail | null> {
  if (callerRole !== "ADMIN") {
    throw new AdminUnauthorizedError();
  }
  return deps.adminRepository.findCircleById(circleId);
}
