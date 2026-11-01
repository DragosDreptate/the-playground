import { prismaUserRepository } from "@/infrastructure/repositories";
import {
  createEmailLocaleResolver,
  type EmailLocaleResolver,
} from "@/lib/email/email-locale";

/**
 * Résolveur de locale email branché sur les langues mémorisées en base
 * (`User.preferredLocale`). Voir `createEmailLocaleResolver` pour la règle.
 */
export function buildEmailLocaleResolver(
  triggerUserId: string | null | undefined,
): Promise<EmailLocaleResolver> {
  return createEmailLocaleResolver(triggerUserId, (userIds) =>
    prismaUserRepository.findPreferredLocalesByIds(userIds),
  );
}
