/**
 * Time utilities for the Moment form date/time picker.
 *
 * Toutes les conversions passent par un fuseau **explicite** (identifiant IANA),
 * jamais par le fuseau du navigateur en implicite : c'est le fuseau de l'événement
 * qui fait foi, et il peut différer de celui de la machine qui édite le formulaire.
 * Voir spec/decisions/0008-fuseau-horaire-affichage-visiteur.md
 */

import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

export type TimeOption = {
  value: string; // "HH:mm"
  label: string; // "HH:mm" (display)
};

/**
 * Generate 30-minute time slots from 00:00 to 23:30.
 */
export function generateTimeOptions(): TimeOption[] {
  const options: TimeOption[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const value = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
      options.push({ value, label: value });
    }
  }
  return options;
}

/**
 * Combine un jour (Date) et une heure ("HH:mm") en instant UTC (chaîne ISO),
 * l'heure étant interprétée **dans `timezone`**, pas dans le fuseau du navigateur.
 *
 * Le jour est lu sur ses composantes civiles locales : le calendrier produit une
 * Date à minuit local, et c'est bien le jour que l'organisateur a vu et cliqué.
 * Seule l'heure a besoin d'être ancrée dans le fuseau de l'événement.
 *
 * Exemple : date=25 févr., time="23:00", timezone="Europe/Dublin"
 *   → "2026-02-25T23:00:00" à Dublin (UTC+0 en février) → "2026-02-25T23:00:00.000Z"
 *
 * Aux transitions d'heure d'été, `fromZonedTime` résout les heures ambiguës
 * (chevauchement d'automne) et inexistantes (saut du printemps) sans lever.
 */
export function combineDateAndTime(date: Date, time: string, timezone: string): string {
  const [h, m] = time.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return "";
  if (isNaN(date.getTime())) return "";

  const pad = (n: number) => n.toString().padStart(2, "0");
  const civil =
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(h)}:${pad(m)}:00`;

  const instant = fromZonedTime(civil, timezone);
  if (isNaN(instant.getTime())) return "";
  return instant.toISOString();
}

/**
 * Extrait "HH:mm" d'un instant, **lu dans `timezone`**.
 *
 * Pendant du combine ci-dessus : sans lui, ouvrir le formulaire d'édition depuis
 * un autre fuseau que celui de l'événement pré-remplirait une heure décalée, que
 * l'organisateur ré-enregistrerait telle quelle — le défaut d'affichage
 * deviendrait une corruption de données.
 */
export function extractTime(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, "HH:mm");
}

/**
 * Extrait le jour civil d'un instant **dans `timezone`**, sous forme de Date à
 * minuit local — la forme attendue par le composant Calendar, qui raisonne en local.
 *
 * Pendant de `extractTime` pour la date : sans lui, un événement de Dublin à 23:30
 * (22:30 UTC) ouvert depuis Paris afficherait le jour SUIVANT dans le calendrier,
 * à côté d'une heure, elle, correcte — le formulaire se contredirait à minuit.
 */
export function extractDatePart(date: Date, timezone: string): Date {
  const [year, month, day] = formatInTimeZone(date, timezone, "yyyy-MM-dd")
    .split("-")
    .map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Snap a time string to the nearest 30-minute slot.
 * E.g. "17:14" → "17:00", "17:16" → "17:30"
 */
export function snapToSlot(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const snapped = m < 15 ? 0 : m < 45 ? 30 : 0;
  const finalH = m >= 45 ? (h + 1) % 24 : h;
  return `${finalH.toString().padStart(2, "0")}:${snapped.toString().padStart(2, "0")}`;
}
