import type { UserRepository } from "@/domain/ports/repositories/user-repository";
import { UserNotFoundError } from "@/domain/errors";

type DeleteAccountInput = {
  userId: string;
};

type DeleteAccountDeps = {
  userRepository: UserRepository;
};

export async function deleteAccount(
  input: DeleteAccountInput,
  deps: DeleteAccountDeps
): Promise<void> {
  const { userRepository } = deps;

  const user = await userRepository.findById(input.userId);
  if (!user) {
    throw new UserNotFoundError(input.userId);
  }

  await userRepository.delete(input.userId);
}
