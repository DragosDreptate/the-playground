import builtinDisposableDomains from "disposable-email-domains";

/**
 * Détection des domaines email jetables.
 *
 * Source : la liste communautaire `disposable-email-domains` (~120k domaines)
 * complétée par une blocklist locale pour les domaines récents non encore
 * couverts (ex. `ibymail.com` et les autres domaines du provider tempmail.ing,
 * exploités lors de l'incident phishing du 14/06/2026).
 *
 * Helper pur — aucune dépendance infra.
 */

// Domaines jetables connus mais absents (ou trop récents) de la liste du package.
// Vérifié le 14/06/2026 : aucun de ceux-ci n'est dans `disposable-email-domains`.
const CUSTOM_DISPOSABLE_DOMAINS = [
  "ibymail.com",
  "tempmail.ing",
  "tempmail101.com",
  "aniimate.net",
  "theeditai.com",
  "gettranslation.app",
  "deepask.app",
  "animatimg.com",
  "animateany.com",
  "usechrono.com",
];

const DISPOSABLE_DOMAINS = new Set<string>([
  ...builtinDisposableDomains,
  ...CUSTOM_DISPOSABLE_DOMAINS,
]);

/** Extrait le domaine normalisé (minuscules) d'une adresse email. */
function extractDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at === -1) return null;
  const domain = email.slice(at + 1).trim().toLowerCase();
  return domain || null;
}

/**
 * Retourne true si l'email appartient à un domaine jetable connu.
 * Insensible à la casse. Renvoie false si l'email est malformé (pas de `@`).
 */
export function isDisposableEmailDomain(email: string): boolean {
  const domain = extractDomain(email);
  return domain !== null && DISPOSABLE_DOMAINS.has(domain);
}
