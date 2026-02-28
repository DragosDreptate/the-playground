import type { DashboardMode } from "@/domain/models/user";
import type { UserRepository } from "@/domain/ports/repositories/user-repository";

type Deps = { userRepository: UserRepository };

export async function setDashboardMode(
  userId: string,
  mode: DashboardMode,
  deps: Deps
): Promise<void> {
  await deps.userRepository.updateDashboardMode(userId, mode);
}
