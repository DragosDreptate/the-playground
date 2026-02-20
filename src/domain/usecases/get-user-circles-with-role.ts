import type { CircleWithRole } from "@/domain/models/circle";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";

type GetUserCirclesWithRoleDeps = {
  circleRepository: CircleRepository;
};

export async function getUserCirclesWithRole(
  userId: string,
  deps: GetUserCirclesWithRoleDeps
): Promise<CircleWithRole[]> {
  return deps.circleRepository.findAllByUserId(userId);
}
