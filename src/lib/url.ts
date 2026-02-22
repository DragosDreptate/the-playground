/** Valide et sanitise un callbackUrl pour éviter les open redirects */
export function safeCallbackUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  // Doit commencer par / mais pas // (URL à protocole relatif)
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  return undefined;
}
