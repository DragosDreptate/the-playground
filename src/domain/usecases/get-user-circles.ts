import type { Circle } from "@/domain/models/circle";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";

type GetUserCirclesDeps = {
  circleRepository: CircleRepository;
};

export async function getUserCircles(
  userId: string,
  deps: GetUserCirclesDeps
): Promise<Circle[]> {
  return deps.circleRepository.findByUserId(userId, "HOST");
}
