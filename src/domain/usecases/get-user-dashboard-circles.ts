import type { DashboardCircle } from "@/domain/models/circle";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";

type Deps = { circleRepository: CircleRepository };

export async function getUserDashboardCircles(
  userId: string,
  deps: Deps
): Promise<DashboardCircle[]> {
  return deps.circleRepository.findAllByUserIdWithStats(userId);
}
