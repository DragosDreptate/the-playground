import { escapeHtml } from "@/lib/html";

/**
 * Placeholder prénom des messages Organisateur → Participants.
 *
 * L'Organisateur insère `{prénom}` (FR) ou `{firstName}` (EN) dans son message
 * via la barre d'outils ; chaque destinataire reçoit son prénom à la place.
 * Les alias couvrent les variantes tapées à la main.
 */
const FIRST_NAME_TOKEN = /\{(?:prénom|prenom|firstname|first name)\}/gi;
/** Le token précédé de son éventuelle espace — pour un retrait propre (« Bonjour {prénom}, » → « Bonjour, »). */
const FIRST_NAME_TOKEN_WITH_SPACE = / ?\{(?:prénom|prenom|firstname|first name)\}/gi;

/**
 * Résout le placeholder prénom dans le HTML (déjà sanitizé) du message,
 * pour UN destinataire. Sans prénom connu, le token est retiré avec l'espace
 * qui le précède. Le prénom est échappé : il est injecté dans du HTML.
 */
export function resolveFirstNamePlaceholders(
  html: string,
  firstName: string | null
): string {
  const trimmed = firstName?.trim();
  if (trimmed) {
    return html.replace(FIRST_NAME_TOKEN, () => escapeHtml(trimmed));
  }
  return html.replace(FIRST_NAME_TOKEN_WITH_SPACE, "");
}
