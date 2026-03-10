import type { PublicUser, PublicCircleMembership, PublicMomentRegistration } from "@/domain/models/user";
import type { UserRepository } from "@/domain/ports/repositories/user-repository";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";

type GetUserPublicProfileInput = {
  publicId: string;
};

type GetUserPublicProfileDeps = {
  userRepository: UserRepository;
  circleRepository: CircleRepository;
  momentRepository: MomentRepository;
};

export type UserPublicProfile = {
  user: PublicUser;
  /** Id interne — fourni à la couche app pour le contrôle isOwnProfile, ne pas exposer au client. */
  internalUserId: string;
  publicCircles: PublicCircleMembership[];
  upcomingPublicMoments: PublicMomentRegistration[];
};

export async function getUserPublicProfile(
  input: GetUserPublicProfileInput,
  deps: GetUserPublicProfileDeps
): Promise<UserPublicProfile | null> {
  const { userRepository, circleRepository, momentRepository } = deps;

  const resolved = await userRepository.resolvePublicProfile(input.publicId);
  if (!resolved) return null;

  const { user, internalUserId } = resolved;

  const [publicCircles, upcomingPublicMoments] = await Promise.all([
    circleRepository.getPublicCirclesForUser(internalUserId),
    momentRepository.getUpcomingPublicMomentsForUser(internalUserId),
  ]);

  return { user, internalUserId, publicCircles, upcomingPublicMoments };
}
