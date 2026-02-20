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
  };

  return userRepository.updateProfile(input.userId, profileInput);
}
