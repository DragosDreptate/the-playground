/**
 * Retourne le nom d'affichage d'un utilisateur.
 * Priorité : prénom + nom > prénom seul > email
 */
export function getDisplayName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  email: string
): string {
  if (firstName && lastName) return `${firstName} ${lastName}`;
  if (firstName) return firstName;
  return email;
}

/**
 * Retourne les initiales d'un membre de Circle pour l'avatar.
 * Priorité : initiales prénom+nom > initiale prénom > initiale email
 */
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
