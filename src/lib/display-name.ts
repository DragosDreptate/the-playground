/**
 * Retourne le nom d'affichage d'un utilisateur, avec l'**email en fallback**.
 *
 * À RÉSERVER aux contextes privés (dashboard Host, emails serveur, admin) où
 * l'exposition de l'email est légitime — par ex. un Host doit pouvoir
 * identifier un Player via son email s'il n'a pas saisi de nom.
 *
 * Pour les contextes publics (page événement publique, page Communauté, listes
 * de membres/inscrits, fil de commentaires), utiliser `getPublicDisplayName` :
 * exposer l'email à un visiteur anonyme constitue une fuite RGPD.
 *
 * Priorité : prénom + nom > prénom seul > email
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

/**
 * Retourne le nom d'affichage d'un utilisateur **sans jamais exposer l'email**.
 *
 * À utiliser pour tout rendu côté pages publiques (visibles par des visiteurs
 * anonymes ou par des Players autres que celui affiché). Le fallback est une
 * étiquette générique localisée passée par le caller (par ex. "Membre" / "Member").
 *
 * Priorité : prénom + nom > prénom seul > fallback générique
 */
export function getPublicDisplayName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  fallback: string,
): string {
  if (firstName && lastName) return `${firstName} ${lastName}`;
  if (firstName) return firstName;
  return fallback;
}

/**
 * Retourne les initiales d'un membre de Circle pour l'avatar (contexte privé,
 * email autorisé en fallback).
 *
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

/**
 * Initiales pour l'avatar dans les contextes publics (jamais d'initiale email).
 *
 * Priorité : initiales prénom+nom > initiale prénom > "?" (placeholder neutre)
 */
export function getPublicUserInitials(user: {
  firstName?: string | null;
  lastName?: string | null;
}): string {
  if (user.firstName && user.lastName)
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  if (user.firstName) return user.firstName[0].toUpperCase();
  return "?";
}
