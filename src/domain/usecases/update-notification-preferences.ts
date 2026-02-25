import type { NotificationPreferences } from "@/domain/models/user";
import type {
  UserRepository,
  UpdateNotificationPreferencesInput,
} from "@/domain/ports/repositories/user-repository";
import { UserNotFoundError } from "@/domain/errors";

type UpdateNotificationPreferencesUseCaseInput = {
  userId: string;
} & UpdateNotificationPreferencesInput;

type UpdateNotificationPreferencesDeps = {
  userRepository: UserRepository;
};

export async function updateNotificationPreferences(
  input: UpdateNotificationPreferencesUseCaseInput,
  deps: UpdateNotificationPreferencesDeps
): Promise<NotificationPreferences> {
  const { userRepository } = deps;

  const user = await userRepository.findById(input.userId);

  if (!user) {
    throw new UserNotFoundError(input.userId);
  }

  return userRepository.updateNotificationPreferences(input.userId, {
    notifyNewRegistration: input.notifyNewRegistration,
    notifyNewComment: input.notifyNewComment,
    notifyNewFollower: input.notifyNewFollower,
    notifyNewMomentInCircle: input.notifyNewMomentInCircle,
  });
}
