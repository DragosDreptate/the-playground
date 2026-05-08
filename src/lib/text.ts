const ELLIPSIS = "…";

/**
 * Tronque une chaîne à `max` caractères en ajoutant un caractère ellipse "…"
 * (le décompte de `max` inclut l'ellipse). Renvoie la chaîne intacte si elle
 * est déjà sous la limite.
 */
export function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - ELLIPSIS.length) + ELLIPSIS;
}

/**
 * Remplace toute séquence d'espaces (espaces, tabs, `\n`, `\r`) par un seul
 * espace, puis trim. Utile pour les `<meta name="description">` et autres
 * attributs HTML one-line : un retour ligne dans la valeur d'attribut casse
 * le scraping de certains clients (WhatsApp, Slack…) qui tronquent au premier
 * `\r` ou `\n`.
 */
export function collapseWhitespace(str: string): string {
  return str.replace(/\s+/g, " ").trim();
}
