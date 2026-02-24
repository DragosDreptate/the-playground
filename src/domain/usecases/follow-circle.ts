import type { CircleFollow } from "@/domain/models/circle";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import {
  CircleNotFoundError,
  AlreadyFollowingCircleError,
} from "@/domain/errors";

type FollowCircleInput = {
  circleId: string;
  userId: string;
};

type FollowCircleDeps = {
  circleRepository: CircleRepository;
};

type FollowCircleResult = {
  follow: CircleFollow;
};

export async function followCircle(
  input: FollowCircleInput,
  deps: FollowCircleDeps
): Promise<FollowCircleResult> {
  const { circleRepository } = deps;

  // Vérifier que le Circle existe
  const circle = await circleRepository.findById(input.circleId);
  if (!circle) {
    throw new CircleNotFoundError(input.circleId);
  }

  // Vérifier que l'utilisateur ne suit pas déjà ce Circle
  const isAlreadyFollowing = await circleRepository.getFollowStatus(
    input.userId,
    input.circleId
  );
  if (isAlreadyFollowing) {
    throw new AlreadyFollowingCircleError();
  }

  const follow = await circleRepository.followCircle(input.userId, input.circleId);

  return { follow };
}
