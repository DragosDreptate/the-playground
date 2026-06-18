/**
 * Logique pure de décision d'identité PostHog.
 *
 * Extraite du composant pour être testable en isolation (l'environnement de
 * test n'a pas de DOM). Le composant `PostHogIdentity` se contente d'exécuter
 * l'action décidée ici.
 *
 * Règle clé : `posthog.reset()` ne doit JAMAIS être appelé pour un visiteur
 * anonyme. Le reset régénère le `distinct_id` et le `session_id`, ce qui casse
 * l'identité anonyme stable (et donc les funnels de conversion). On ne reset
 * que lors d'une vraie déconnexion (transition identifié -> anonyme), détectée
 * via le dernier user identifié connu (persisté en localStorage pour survivre
 * aux reloads provoqués par les déconnexions en server action).
 */

const LAST_IDENTIFIED_KEY = "ph_last_identified_user_id";
const SIGNUP_TRACKED_PREFIX = "ph_signup_tracked_";

export type IdentityAction =
  | { type: "identify"; userId: string }
  | { type: "reset" }
  | { type: "none" };

/**
 * Décide l'action PostHog à effectuer.
 *
 * Un utilisateur connecté est (ré)identifié à chaque appel : `posthog.identify`
 * est idempotent et garantit que les propriétés (email, name) restent fraîches
 * dans PostHog. On ne reset que pour une vraie déconnexion (un anonyme qui
 * avait un user identifié auparavant).
 *
 * @param currentUserId        id de l'utilisateur courant (null si anonyme)
 * @param lastIdentifiedUserId dernier user identifié connu (null si aucun)
 */
export function decideIdentityAction(
  currentUserId: string | null,
  lastIdentifiedUserId: string | null,
): IdentityAction {
  if (currentUserId) {
    return { type: "identify", userId: currentUserId };
  }

  // Anonyme : reset SEULEMENT s'il y avait un user identifié auparavant
  // (vraie déconnexion). Un anonyme resté anonyme ne déclenche rien.
  if (lastIdentifiedUserId) {
    return { type: "reset" };
  }
  return { type: "none" };
}

export function readLastIdentifiedUserId(): string | null {
  try {
    return window.localStorage.getItem(LAST_IDENTIFIED_KEY);
  } catch {
    // localStorage indisponible (SSR, navigation privée, quota) : on dégrade
    // silencieusement vers "aucun user connu".
    return null;
  }
}

export function writeLastIdentifiedUserId(userId: string): void {
  try {
    window.localStorage.setItem(LAST_IDENTIFIED_KEY, userId);
  } catch {
    // dégradation silencieuse
  }
}

export function clearLastIdentifiedUserId(): void {
  try {
    window.localStorage.removeItem(LAST_IDENTIFIED_KEY);
  } catch {
    // dégradation silencieuse
  }
}

/** Indique si l'event `user_signed_up` a déjà été capturé pour cet utilisateur. */
export function isSignupTracked(userId: string): boolean {
  try {
    return (
      window.localStorage.getItem(`${SIGNUP_TRACKED_PREFIX}${userId}`) !== null
    );
  } catch {
    // En cas d'indisponibilité, on considère "non tracké" : la garde mémoire
    // (trackedRef) évite le doublon sur la durée de vie du composant.
    return false;
  }
}

export function markSignupTracked(userId: string): void {
  try {
    window.localStorage.setItem(`${SIGNUP_TRACKED_PREFIX}${userId}`, "1");
  } catch {
    // dégradation silencieuse
  }
}
