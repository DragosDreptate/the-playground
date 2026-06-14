/**
 * Garde anti-usurpation des noms de profil.
 *
 * Filet secondaire contre les comptes qui se font passer pour la plateforme ou
 * son support (ex. "PLAYGROUND SUPP0RT", "Adm1n"). Ce n'est PAS le bloqueur
 * principal : un attaquant peut mettre un vrai nom pour passer. Le levier fiable
 * reste la blocklist d'identité au sign-in (cf. sign-in-blocklist.ts).
 */

// Normalisation leet courante (0->o, 1->i, etc.) pour neutraliser les
// contournements type "SUPP0RT" / "PLAYGR0UND" / "Adm1n".
const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
  "@": "a",
  $: "s",
};

/** Tokens réservés : noms qui usurpent la plateforme, le support ou l'admin. */
const RESERVED_TOKENS = [
  "playground",
  "support",
  "admin",
  "moderation",
  "moderateur",
  "noreply",
];

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // diacritiques
    .split("")
    .map((c) => LEET[c] ?? c)
    .join("")
    .replace(/[^a-z]/g, ""); // ne garde que les lettres
}

/**
 * Retourne true si le nom (prénom + nom concaténés) contient un token réservé,
 * après normalisation leet/accents/espaces.
 */
export function isImpersonatingName(
  ...parts: Array<string | null | undefined>
): boolean {
  const normalized = normalize(parts.filter(Boolean).join(" "));
  return RESERVED_TOKENS.some((token) => normalized.includes(token));
}
