import type { User } from "@/domain/models/user";
import type { UserRepository } from "@/domain/ports/repositories/user-repository";
import { UserNotFoundError } from "@/domain/errors";

type GetProfileInput = {
  userId: string;
};

type GetProfileDeps = {
  userRepository: UserRepository;
};

export async function getProfile(
  input: GetProfileInput,
  deps: GetProfileDeps
): Promise<User> {
  const { userRepository } = deps;

  const user = await userRepository.findById(input.userId);

  if (!user) {
    throw new UserNotFoundError(input.userId);
  }

  return user;
}
