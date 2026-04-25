/**
 * Wrapper autour de la classe Resend qui bloque les envois hors production
 * vers des adresses non explicitement autorisées.
 *
 * Activation : tout environnement où `VERCEL_ENV !== "production"`. Cela couvre
 *   - prod Vercel → guard désactivé (envois normaux)
 *   - staging / preview Vercel → guard activé
 *   - dev local (pnpm dev / pnpm start) → guard activé (VERCEL_ENV undefined)
 *   - CI GitHub Actions → guard activé (VERCEL_ENV undefined)
 *
 * Allowlist : `STAGING_EMAIL_ALLOWLIST="email1@x,email2@y"` (comma-separated).
 *
 * Règles (quand le guard est actif) :
 * 1. Email explicitement listé dans STAGING_EMAIL_ALLOWLIST (case-insensitive)
 * 2. Email qui se termine par @test.playground (auto-whitelist comptes test)
 * 3. Email qui se termine par @demo.playground (auto-whitelist comptes démo)
 *
 * Fail-closed : si l'allowlist est vide ou mal formée, tout est bloqué par défaut.
 * Mieux vaut ne rien envoyer qu'envoyer par erreur à un vrai utilisateur.
 *
 * IMPORTANT : cette fonction doit être utilisée partout où le projet instancie
 * `new Resend(...)`. C'est le seul garde-fou qui garantit qu'aucun email ne
 * part à un vrai utilisateur depuis un environnement de dev/test/preview.
 */

import { Resend } from "resend";

const AUTO_WHITELIST_SUFFIXES = ["@test.playground", "@demo.playground"];

function parseAllowlist(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

function isAllowedInStaging(to: string, allowlist: string[]): boolean {
  const lower = to.toLowerCase();
  if (allowlist.includes(lower)) return true;
  return AUTO_WHITELIST_SUFFIXES.some((suffix) => lower.endsWith(suffix));
}

function normalizeRecipients(to: string | string[] | undefined): string[] {
  if (!to) return [];
  return Array.isArray(to) ? to : [to];
}

/**
 * Retourne une instance Resend. En staging, wrap `emails.send()` et `batch.send()`
 * avec un guard qui bloque les envois vers des adresses hors allowlist.
 */
export function createSafeResend(apiKey?: string): Resend {
  const resend = new Resend(apiKey ?? "re_not_configured");

  // Seul VERCEL_ENV=production désactive le guard. Tout le reste (preview,
  // staging, local, CI) le laisse actif — fail-closed par défaut.
  if (process.env.VERCEL_ENV === "production") {
    return resend;
  }

  const allowlist = parseAllowlist(process.env.STAGING_EMAIL_ALLOWLIST ?? "");

  // Intercept resend.emails.send — envois unitaires
  const originalSend = resend.emails.send.bind(resend.emails);
  resend.emails.send = (async (...args: Parameters<typeof originalSend>) => {
    const payload = args[0] as { to?: string | string[] } | undefined;
    const recipients = normalizeRecipients(payload?.to);

    const blocked = recipients.filter((to) => !isAllowedInStaging(to, allowlist));
    if (blocked.length > 0) {
      console.warn(
        `[staging-guard] Blocked email to ${blocked.length} recipient(s):`,
        blocked,
      );
      return {
        data: { id: "staging-guard-blocked" },
        error: null,
      } as Awaited<ReturnType<typeof originalSend>>;
    }

    return originalSend(...args);
  }) as typeof originalSend;

  // Intercept resend.batch.send — envois en masse (notifications membres, etc.)
  const originalBatchSend = resend.batch.send.bind(resend.batch);
  resend.batch.send = (async (payload: Parameters<typeof originalBatchSend>[0], options?: Parameters<typeof originalBatchSend>[1]) => {
    const emails = (payload ?? []) as ReadonlyArray<{ to?: string | string[] }>;

    const allowed: typeof emails[number][] = [];
    const blocked: string[] = [];
    for (const email of emails) {
      const recipients = normalizeRecipients(email.to);
      const hasBlocked = recipients.some((to) => !isAllowedInStaging(to, allowlist));
      if (hasBlocked) {
        blocked.push(...recipients);
      } else {
        allowed.push(email);
      }
    }

    if (blocked.length > 0) {
      console.warn(
        `[staging-guard] Blocked batch: ${blocked.length} recipient(s):`,
        blocked,
      );
    }

    if (allowed.length === 0) {
      return {
        data: { data: [] },
        error: null,
      } as Awaited<ReturnType<typeof originalBatchSend>>;
    }

    return originalBatchSend(allowed as Parameters<typeof originalBatchSend>[0], options);
  }) as typeof originalBatchSend;

  return resend;
}

// Exports internes pour les tests uniquement
export const __internal = {
  parseAllowlist,
  isAllowedInStaging,
  normalizeRecipients,
};
