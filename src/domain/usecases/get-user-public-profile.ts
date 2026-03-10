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
  publicCircles: PublicCircleMembership[];
  upcomingPublicMoments: PublicMomentRegistration[];
};

export async function getUserPublicProfile(
  input: GetUserPublicProfileInput,
  deps: GetUserPublicProfileDeps
): Promise<UserPublicProfile | null> {
  const { userRepository, circleRepository, momentRepository } = deps;

  const user = await userRepository.getPublicUserByPublicId(input.publicId);
  if (!user) return null;

  // userId n'est pas dans PublicUser — on doit le résoudre via le publicId
  // Le repository getPublicUserByPublicId retourne les données publiques,
  // mais les requêtes suivantes ont besoin de l'userId interne.
  // On le récupère via une méthode dédiée sur le UserRepository.
  const internalUserId = await userRepository.findUserIdByPublicId(input.publicId);
  if (!internalUserId) return null;

  const [publicCircles, upcomingPublicMoments] = await Promise.all([
    circleRepository.getPublicCirclesForUser(internalUserId),
    momentRepository.getUpcomingPublicMomentsForUser(internalUserId),
  ]);

  return { user, publicCircles, upcomingPublicMoments };
}
