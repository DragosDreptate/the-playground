/**
 * Valide et sanitise un callbackUrl pour éviter les open redirects.
 * N'autorise que les chemins internes (relatifs à l'origine). Rejette les URLs
 * absolues, à protocole relatif ("//"), et les astuces backslash ("/\\evil.com",
 * brutes ou %5C-encodées) que le parser WHATWG résout hors de l'origine.
 */
export function safeCallbackUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  // Doit être un chemin relatif à l'origine : commence par "/" mais pas "//".
  if (!url.startsWith("/") || url.startsWith("//")) return undefined;
  // Le backslash (brut ou %5C-encodé) est traité comme "/" par les navigateurs :
  // "/\evil.com" est résolu en "https://evil.com/". On le rejette explicitement.
  if (url.includes("\\") || /%5c/i.test(url)) return undefined;
  // Défense en profondeur : résolution canonique contre une origine factice.
  // Toute évasion hors origine (astuce non anticipée) fait basculer l'origine → rejet.
  try {
    if (new URL(url, "https://example.invalid").origin !== "https://example.invalid") {
      return undefined;
    }
  } catch {
    return undefined;
  }
  return url;
}

/** Retire le protocole http(s):// d'une URL pour l'affichage */
export function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

/** Vérifie qu'une chaîne est une URL valide (http ou https) */
export function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
