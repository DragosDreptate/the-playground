import type { User } from "@/domain/models/user";
import type {
  UserRepository,
  UpdateProfileInput,
} from "@/domain/ports/repositories/user-repository";
import { UserNotFoundError } from "@/domain/errors";

type UpdateProfileUseCaseInput = {
  userId: string;
  firstName: string;
  lastName: string;
  name?: string | null;
  image?: string | null;
  bio?: string | null;
  city?: string | null;
  website?: string | null;
  linkedinUrl?: string | null;
  twitterUrl?: string | null;
  githubUrl?: string | null;
};

type UpdateProfileDeps = {
  userRepository: UserRepository;
};

export async function updateProfile(
  input: UpdateProfileUseCaseInput,
  deps: UpdateProfileDeps
): Promise<User> {
  const { userRepository } = deps;

  const user = await userRepository.findById(input.userId);

  if (!user) {
    throw new UserNotFoundError(input.userId);
  }

  const profileInput: UpdateProfileInput = {
    firstName: input.firstName,
    lastName: input.lastName,
    ...(input.name !== undefined && { name: input.name }),
    ...(input.image !== undefined && { image: input.image }),
    ...(input.bio !== undefined && { bio: input.bio }),
    ...(input.city !== undefined && { city: input.city }),
    ...(input.website !== undefined && { website: input.website }),
    ...(input.linkedinUrl !== undefined && { linkedinUrl: input.linkedinUrl }),
    ...(input.twitterUrl !== undefined && { twitterUrl: input.twitterUrl }),
    ...(input.githubUrl !== undefined && { githubUrl: input.githubUrl }),
  };

  return userRepository.updateProfile(input.userId, profileInput);
}
