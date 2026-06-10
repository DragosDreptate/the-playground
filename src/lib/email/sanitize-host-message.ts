import sanitizeHtml from "sanitize-html";

export const HOST_MESSAGE_BODY_MAX_TEXT_LENGTH = 5000;

/**
 * Allowlist stricte du corps rich text des messages Organisateur → Participants.
 * Tout le reste (script, img, iframe, handlers on*, styles entrants) est strippé.
 * Les liens reçoivent un style inline email-safe (rose primary, souligné).
 */
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "strong", "em", "ul", "ol", "li", "a"],
  allowedAttributes: { a: ["href", "style", "target", "rel"] },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: sanitizeHtml.simpleTransform(
      "a",
      {
        style: "color: #e8457a; text-decoration: underline;",
        target: "_blank",
        rel: "noopener noreferrer",
      },
      true // merge : conserve le href entrant
    ),
  },
};

export function sanitizeHostMessageHtml(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}

/** Longueur du texte seul (balises exclues) — base de la limite de 5000 caractères. */
export function extractHostMessageTextLength(html: string): number {
  const text = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} });
  return text.replace(/\s+/g, " ").trim().length;
}
