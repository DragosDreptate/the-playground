import type { UserRepository } from "@/domain/ports/repositories/user-repository";

type Deps = { userRepository: UserRepository };

/**
 * Mémorise la langue d'interface choisie par l'utilisateur : ses emails partent
 * ensuite dans cette langue. La dernière langue choisie l'emporte.
 * La validité de `locale` (langues supportées) est vérifiée côté app.
 */
export async function setPreferredLocale(
  userId: string,
  locale: string,
  deps: Deps
): Promise<void> {
  await deps.userRepository.updatePreferredLocale(userId, locale);
}

/**
 * Mémorise la langue uniquement si aucune n'est encore connue. Rattrape les
 * comptes existants sans écraser un choix déjà fait.
 */
export async function rememberPreferredLocaleIfMissing(
  userId: string,
  locale: string,
  deps: Deps
): Promise<void> {
  await deps.userRepository.setPreferredLocaleIfMissing(userId, locale);
}
