/**
 * Contextes privés uniquement (Host dashboard, emails serveur, admin) :
 * fallback sur l'email autorisé. Pour les pages publiques, utiliser
 * `getPublicDisplayName` — exposer l'email serait une fuite RGPD.
 */
export function getDisplayName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  email: string,
): string {
  if (firstName && lastName) return `${firstName} ${lastName}`;
  if (firstName) return firstName;
  return email;
}

/** Pages publiques : fallback générique localisé fourni par le caller. */
export function getPublicDisplayName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  fallback: string,
): string {
  if (firstName && lastName) return `${firstName} ${lastName}`;
  if (firstName) return firstName;
  return fallback;
}

/** Initiales avatar — contextes privés (email[0] autorisé en fallback). */
export function getCircleUserInitials(user: {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}): string {
  if (user.firstName && user.lastName)
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  if (user.firstName) return user.firstName[0].toUpperCase();
  return user.email[0].toUpperCase();
}

/** Initiales avatar — pages publiques, fallback "?" (jamais email[0]). */
export function getPublicUserInitials(user: {
  firstName?: string | null;
  lastName?: string | null;
}): string {
  if (user.firstName && user.lastName)
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  if (user.firstName) return user.firstName[0].toUpperCase();
  return "?";
}
