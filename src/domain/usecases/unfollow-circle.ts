import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import { NotFollowingCircleError } from "@/domain/errors";

type UnfollowCircleInput = {
  circleId: string;
  userId: string;
};

type UnfollowCircleDeps = {
  circleRepository: CircleRepository;
};

export async function unfollowCircle(
  input: UnfollowCircleInput,
  deps: UnfollowCircleDeps
): Promise<void> {
  const { circleRepository } = deps;

  // Vérifier que l'utilisateur suit bien ce Circle
  const isFollowing = await circleRepository.getFollowStatus(
    input.userId,
    input.circleId
  );
  if (!isFollowing) {
    throw new NotFollowingCircleError();
  }

  await circleRepository.unfollowCircle(input.userId, input.circleId);
}
