/** Valide et sanitise un callbackUrl pour éviter les open redirects */
export function safeCallbackUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  // Doit commencer par / mais pas // (URL à protocole relatif)
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  return undefined;
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
