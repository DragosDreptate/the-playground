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

/**
 * Normalise les fins de ligne en `\n`.
 *
 * Un `<textarea>` soumis dans un formulaire HTML renvoie ses retours à la ligne
 * en `\r\n` (normalisation imposée par la spec), alors que la valeur lue en JS
 * côté client (`.value.length`, `maxLength`) les compte en `\n`. Sans cette
 * normalisation, un texte affiché à 158 caractères dans le navigateur en fait
 * 162 à l'arrivée sur le serveur, et une colonne bornée le rejette.
 */
export function normalizeLineBreaks(str: string): string {
  return str.replace(/\r\n?/g, "\n");
}

/**
 * Indique si `value` dépasse `max` caractères, au sens où Postgres les compte
 * dans un `varchar(n)` : en points de code, là où `String.length` compte en
 * unités UTF-16 (un emoji hors BMP pèse 2 d'un côté, 1 de l'autre).
 *
 * Le décompte exact n'est fait que dans la zone grise : un point de code vaut
 * 1 ou 2 unités UTF-16, donc en dessous de `max` unités la valeur tient
 * toujours, et au-delà de `2 * max` elle dépasse toujours. Un payload forgé de
 * plusieurs Mo est ainsi rejeté sans être parcouru.
 */
export function exceedsCharacterCap(value: string, max: number): boolean {
  if (value.length <= max) return false;
  if (value.length > max * 2) return true;
  return Array.from(value).length > max;
}
