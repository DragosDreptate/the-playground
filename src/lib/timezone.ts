/**
 * Libellés lisibles d'un fuseau IANA.
 *
 * Utilisés là où l'heure d'un événement est rendue **sans visiteur identifiable**
 * (emails, notifications, image OG) : le lecteur doit savoir dans quel fuseau
 * l'heure est exprimée, puisque rien ne l'a convertie pour lui.
 * Voir spec/decisions/0008-fuseau-horaire-affichage-visiteur.md
 */

/**
 * "Europe/Dublin" → "Dublin", "America/New_York" → "New York".
 *
 * On prend le dernier segment plutôt qu'un mapping exhaustif : c'est la ville de
 * référence du fuseau, suffisamment parlante, et ça n'a rien à maintenir quand la
 * base IANA évolue.
 */
export function getTimezoneCityLabel(timezone: string): string {
  const city = timezone.split("/").pop();
  if (!city) return timezone;
  return city.replace(/_/g, " ");
}

/**
 * Mention à accoler à une heure : « heure de Dublin » / « Dublin time ».
 *
 * `UTC` n'a pas de ville de référence — on le laisse tel quel plutôt que de
 * produire « heure de UTC ».
 */
export function formatTimezoneMention(timezone: string, locale: string): string {
  const city = getTimezoneCityLabel(timezone);
  if (city === "UTC" || city === "GMT") return city;
  return locale === "fr" ? `heure de ${city}` : `${city} time`;
}
