/**
 * Surveillance du quota d'envoi quotidien de Resend (plan gratuit : 100 emails/jour).
 *
 * Resend renvoie sur chaque réponse d'envoi un header `x-resend-daily-quota`
 * contenant le nombre d'emails déjà envoyés aujourd'hui (cumulé, plan gratuit
 * uniquement). On lit ce chiffre à chaque envoi et on alerte sur Slack quand on
 * franchit un palier (70 puis 90), une seule fois par palier et par jour.
 *
 * Limites assumées :
 * - L'état est en mémoire de l'instance serverless : plusieurs instances chaudes
 *   peuvent émettre la même alerte (doublons tolérés, sans gravité).
 * - Le header n'est présent que sur le plan gratuit : après un passage à un plan
 *   payant, `used` vaut NaN et la surveillance se désactive d'elle-même.
 * - Slack est prod-only (voir slack-notification-service) : aucune alerte hors prod.
 */

import { notifySlackQuotaWarning } from "../slack/slack-notification-service";

const TIERS = [70, 90] as const;
const QUOTA_HEADER = "x-resend-daily-quota";

// État en mémoire — anti-spam (une alerte par palier) + détection du nouveau jour.
let lastTierAlerted = 0;
let lastSeenUsed = 0;

/**
 * À appeler après chaque envoi Resend, avec les headers de la réponse.
 * Ne lève jamais d'exception : la surveillance ne doit jamais casser un envoi.
 */
export async function checkResendQuota(
  headers: Record<string, string> | null | undefined,
): Promise<void> {
  try {
    const used = Number(headers?.[QUOTA_HEADER]);
    if (Number.isNaN(used)) return;

    // Le quota a baissé → Resend l'a remis à zéro à minuit → nouveau jour, on réarme.
    if (used < lastSeenUsed) lastTierAlerted = 0;
    lastSeenUsed = used;

    const highest = Math.max(0, ...TIERS.filter((tier) => used >= tier));
    if (highest > lastTierAlerted) {
      lastTierAlerted = highest;
      await notifySlackQuotaWarning(used, highest);
    }
  } catch {
    // Best-effort : un échec de surveillance ne doit jamais bloquer un envoi.
  }
}

/** Réinitialise l'état mémoire — tests uniquement. */
export function __resetForTests(): void {
  lastTierAlerted = 0;
  lastSeenUsed = 0;
}
