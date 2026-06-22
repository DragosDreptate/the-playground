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

/** Normalise un domaine : minuscules, trim, sans point final FQDN. */
export function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/\.+$/, "");
}

/** Extrait le domaine normalisé (minuscules, sans point final FQDN) d'un email. */
export function extractDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at === -1) return null;
  const domain = normalizeDomain(email.slice(at + 1));
  return domain || null;
}

/**
 * Suffixes parents d'un domaine (>= 2 labels), pour matcher aussi les
 * sous-domaines distribués par les providers (ex. `mail.mailinator.com`,
 * `x.ibymail.com`). N'inclut jamais un TLD seul.
 */
function domainSuffixes(domain: string): string[] {
  const labels = domain.split(".");
  const suffixes: string[] = [];
  for (let i = 0; i + 2 <= labels.length; i++) {
    suffixes.push(labels.slice(i).join("."));
  }
  return suffixes;
}

/**
 * Retourne true si le domaine de l'email (ou un de ses suffixes parents) figure
 * dans `domains`. Insensible à la casse. `domains` est normalisé à chaque appel
 * (prévu pour de petits ensembles, ex. la surcouche dynamique Edge Config).
 * Renvoie false si l'email est malformé (pas de `@`).
 */
export function matchesDomainSuffix(
  email: string,
  domains: Iterable<string>
): boolean {
  const domain = extractDomain(email);
  if (domain === null) return false;
  const set = new Set<string>();
  for (const d of domains) {
    const norm = normalizeDomain(d);
    if (norm) set.add(norm);
  }
  if (set.size === 0) return false;
  return domainSuffixes(domain).some((suffix) => set.has(suffix));
}

/**
 * Retourne true si l'email appartient à un domaine jetable connu (liste
 * statique de ~120k domaines + blocklist custom). Insensible à la casse, couvre
 * les sous-domaines. Renvoie false si l'email est malformé (pas de `@`).
 */
export function isDisposableEmailDomain(email: string): boolean {
  const domain = extractDomain(email);
  if (domain === null) return false;
  return domainSuffixes(domain).some((suffix) => DISPOSABLE_DOMAINS.has(suffix));
}
