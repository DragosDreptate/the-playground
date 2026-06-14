/**
 * Blocklist de connexion — mesure anti-abus.
 *
 * Bloque les acteurs malveillants connus AU MOMENT DU SIGN-IN, indépendamment
 * du nom affiché (l'acteur change de nom mais réutilise le même compte Google).
 * Le levier fiable est l'identité OAuth (`providerAccountId`) + l'email, pas le
 * nom de profil qui est trivialement falsifiable.
 *
 * Maintenue à la main pour les incidents. Pour un volume plus large, migrer
 * vers une table DB + UI admin (cf. issue suspension de compte).
 */

/** Emails bloqués (comparaison insensible à la casse). */
const BLOCKED_EMAILS = new Set<string>(["ixewufoy22@gmail.com"]);

/**
 * Identités OAuth bloquées par `providerAccountId`.
 * Robuste face au changement d'email/nom tant que l'acteur réutilise le même
 * compte du fournisseur (Google).
 */
const BLOCKED_OAUTH_ACCOUNT_IDS = new Set<string>([
  // Google — acteur "PLAYGROUND SUPP0RT" (usurpation du support, 2026-06-14)
  "113146911556107410982",
]);

export function isBlockedSignIn(
  email?: string | null,
  providerAccountId?: string | null
): boolean {
  if (email && BLOCKED_EMAILS.has(email.trim().toLowerCase())) return true;
  if (providerAccountId && BLOCKED_OAUTH_ACCOUNT_IDS.has(providerAccountId)) {
    return true;
  }
  return false;
}
