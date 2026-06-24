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

export type QuotaTier = 70 | 90 | 100;

/**
 * Palier de quota atteint (100 prioritaire sur 90 prioritaire sur 70), ou null
 * sous le premier seuil. 100 = plafond du plan gratuit (envois bloqués au-delà).
 */
export function quotaTier(used: number): QuotaTier | null {
  if (used >= 100) return 100;
  if (used >= 90) return 90;
  if (used >= 70) return 70;
  return null;
}

/** État du dernier palier notifié, persisté par jour UTC (Edge Config). */
export type QuotaAlertState = { date: string; tier: QuotaTier };

/**
 * Décide s'il faut notifier le palier courant. On ne notifie qu'au FRANCHISSEMENT
 * d'un palier strictement supérieur à celui déjà notifié le même jour UTC. Un état
 * daté d'un autre jour (ou absent) compte comme « rien notifié aujourd'hui » →
 * reset implicite à minuit UTC, sans persistance à purger.
 */
export function shouldNotifyQuota(
  tier: QuotaTier,
  todayUtc: string,
  state: QuotaAlertState | undefined
): boolean {
  const notifiedToday = state?.date === todayUtc ? state.tier : 0;
  return tier > notifiedToday;
}
