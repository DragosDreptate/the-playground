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
  // Roundcube auto-hébergé (domaine créé déc. 2024), utilisé comme jetable pour
  // un compte spam/SEO le 21/06/2026.
  "mailsecondary.com",
];

const DISPOSABLE_DOMAINS = new Set<string>([
  ...builtinDisposableDomains,
  ...CUSTOM_DISPOSABLE_DOMAINS,
]);

/** Extrait le domaine normalisé (minuscules, sans point final FQDN) d'un email. */
function extractDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at === -1) return null;
  const domain = email
    .slice(at + 1)
    .trim()
    .toLowerCase()
    .replace(/\.+$/, ""); // retire le point final (forme FQDN : "ibymail.com.")
  return domain || null;
}

/**
 * Retourne true si l'email appartient à un domaine jetable connu.
 *
 * Teste le domaine ET ses suffixes parents (>= 2 labels), pour bloquer aussi
 * les sous-domaines distribués par les providers jetables (ex.
 * `mail.mailinator.com`, `x.ibymail.com`). Insensible à la casse. Renvoie false
 * si l'email est malformé (pas de `@`).
 */
export function isDisposableEmailDomain(email: string): boolean {
  const domain = extractDomain(email);
  if (domain === null) return false;
  const labels = domain.split(".");
  // i s'arrête à length-2 pour ne jamais tester un TLD seul.
  for (let i = 0; i + 2 <= labels.length; i++) {
    if (DISPOSABLE_DOMAINS.has(labels.slice(i).join("."))) return true;
  }
  return false;
}
