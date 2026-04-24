/**
 * Wrapper autour de la classe Resend qui bloque les envois en staging
 * vers des adresses hors d'une allowlist.
 *
 * Activation : `IS_STAGING=true` dans l'environnement (scopé Preview + branche staging sur Vercel).
 * Allowlist : `STAGING_EMAIL_ALLOWLIST="email1@x,email2@y"` (comma-separated).
 *
 * Règles d'allowlist (staging uniquement) :
 * 1. Email explicitement listé dans STAGING_EMAIL_ALLOWLIST (case-insensitive)
 * 2. Email qui se termine par @test.playground (auto-whitelist comptes test)
 * 3. Email qui se termine par @demo.playground (auto-whitelist comptes démo)
 *
 * Fail-closed : si IS_STAGING=true mais allowlist vide ou mal formée,
 * tout est bloqué par défaut. Mieux vaut ne rien envoyer qu'envoyer par erreur.
 *
 * IMPORTANT : cette fonction doit être utilisée partout où le projet instancie
 * `new Resend(...)`. C'est le seul garde-fou qui garantit qu'aucun email ne
 * part à un vrai utilisateur quand on teste en staging avec des données prod.
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
 * Retourne une instance Resend. En staging, wrap `emails.send()` avec un guard
 * qui bloque les envois vers des adresses hors allowlist.
 */
export function createSafeResend(apiKey?: string): Resend {
  const resend = new Resend(apiKey ?? "re_not_configured");

  if (process.env.IS_STAGING !== "true") {
    return resend;
  }

  const allowlist = parseAllowlist(process.env.STAGING_EMAIL_ALLOWLIST ?? "");
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

  return resend;
}

// Exports internes pour les tests uniquement
export const __internal = {
  parseAllowlist,
  isAllowedInStaging,
  normalizeRecipients,
};
