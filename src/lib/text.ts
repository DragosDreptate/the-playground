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
