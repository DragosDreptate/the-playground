/**
 * Compte les emails Resend envoyés le jour UTC donné.
 *
 * `created_at` arrive au format `2026-06-03 18:18:22.509285+00` (espace,
 * microsecondes, offset `+00`) — non-ISO, donc on compare par préfixe de date
 * plutôt que via `new Date()`, dont le parsing de ce format n'est pas garanti
 * d'un moteur à l'autre. `created_at` étant en UTC (+00), son préfixe
 * `YYYY-MM-DD` EST la date UTC.
 */
export function countSentToday(
  emails: { created_at: string }[],
  todayUtc: string
): number {
  return emails.filter((email) => email.created_at.slice(0, 10) === todayUtc)
    .length;
}

/** Palier de quota dépassé (90 prioritaire sur 70), ou null sous le seuil. */
export function quotaTier(used: number): 70 | 90 | null {
  if (used >= 90) return 90;
  if (used >= 70) return 70;
  return null;
}
