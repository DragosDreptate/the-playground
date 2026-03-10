/**
 * Retourne le nom d'affichage d'un utilisateur.
 * Priorité : prénom + nom > prénom seul > email
 */
export function getDisplayName(
  firstName: string | null,
  lastName: string | null,
  email: string
): string {
  if (firstName && lastName) return `${firstName} ${lastName}`;
  if (firstName) return firstName;
  return email;
}
