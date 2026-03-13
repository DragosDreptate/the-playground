import type { UserRole } from "@/domain/models/user";
import type { AdminRepository } from "@/domain/ports/repositories/admin-repository";
import { AdminUnauthorizedError } from "@/domain/errors";

type Deps = { adminRepository: AdminRepository };

export async function adminUpdateCircleOverrideScore(
  callerRole: UserRole,
  circleId: string,
  score: number | null,
  deps: Deps
): Promise<void> {
  if (callerRole !== "ADMIN") throw new AdminUnauthorizedError();
  await deps.adminRepository.updateCircleOverrideScore(circleId, score);
}
