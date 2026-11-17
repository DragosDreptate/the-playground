/**
 * Generate an iCalendar (.ics) file content for a Moment.
 *
 * When attached to an email, mail clients (Gmail, Apple Mail, Outlook)
 * detect it and offer "Add to calendar" automatically.
 */

type IcsEventData = {
  uid: string; // Unique identifier (momentId)
  title: string;
  description: string;
  startsAt: Date;
  endsAt: Date | null; // Falls back to startsAt + 2h
  location: string; // Pre-formatted location text
  videoLink?: string | null; // Video conference URL — overrides location for ONLINE events
  url: string; // Public URL of the Moment
  organizerName: string; // Circle name
  /**
   * iCalendar METHOD (RFC 5546).
   * - "PUBLISH" : informationnel — pour le téléchargement direct (.ics)
   * - "REQUEST" : invitation meeting — déclenche la bannière calendrier inline dans Outlook
   * @default "PUBLISH"
   */
  method?: "PUBLISH" | "REQUEST";
  /** Email du participant (ATTENDEE). Requis pour METHOD:REQUEST (conformité RFC 6047). */
  attendeeEmail?: string;
};

function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// Sans heure de fin, un événement dure deux heures dans l'agenda.
function eventEnd(startsAt: Date, endsAt: Date | null): Date {
  return endsAt ?? new Date(startsAt.getTime() + 2 * 60 * 60 * 1000);
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function generateIcs(data: IcsEventData): string {
  const method = data.method ?? "PUBLISH";
  const dtStart = formatIcsDate(data.startsAt);
  const dtEnd = formatIcsDate(eventEnd(data.startsAt, data.endsAt));
  const now = formatIcsDate(new Date());

  // LOCATION : URL vidéo si dispo (Apple Calendar, Outlook affichent un lien cliquable)
  const locationValue = data.videoLink ?? data.location;

  // DESCRIPTION : préfixe le lien vidéo pour garantir sa présence après import
  // (CONFERENCE et LOCATION ne persistent pas de façon fiable dans tous les clients)
  const fullDescription = data.videoLink
    ? `Rejoindre : ${data.videoLink}\n\n${data.description}`
    : data.description;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Playground//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${method}`,
    "BEGIN:VEVENT",
    `UID:${data.uid}@theplayground`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(data.title)}`,
    `DESCRIPTION:${escapeIcsText(fullDescription)}`,
    `LOCATION:${escapeIcsText(locationValue)}`,
    // CONFERENCE property (RFC 7986) — Google Calendar renders a "Join" button
    ...(data.videoLink
      ? [`CONFERENCE;FEATURE=VIDEO;LABEL="Lien de réunion";VALUE=URI:${data.videoLink}`]
      : []),
    `URL:${data.url}`,
    `ORGANIZER;CN=${escapeIcsText(data.organizerName)}:MAILTO:hello@the-playground.fr`,
    // ATTENDEE requis pour METHOD:REQUEST (RFC 6047 — iMIP)
    // Déclenche la bannière calendrier inline dans Outlook
    ...(method === "REQUEST" && data.attendeeEmail
      ? [`ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED:MAILTO:${data.attendeeEmail}`]
      : []),
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.join("\r\n");
}

// ── Flux d'abonnement (plusieurs événements) ─────────────────

export type IcsFeedEvent = {
  uid: string; // momentId — même UID que le .ics unitaire : c'est le même événement
  title: string;
  description: string;
  startsAt: Date;
  endsAt: Date | null; // Falls back to startsAt + 2h
  location: string | null; // Texte déjà formaté, null = pas de LOCATION
  url: string;
  cancelled: boolean;
  // Permet aux agendas (Outlook notamment) de retenir la version la plus
  // récente d'un événement déjà connu sous le même UID (invitation par email).
  updatedAt: Date;
};

type IcsFeedData = {
  calendarName: string;
  events: IcsFeedEvent[];
};

// Délai de relecture suggéré aux agendas abonnés (Apple et Outlook le
// respectent, Google rafraîchit à son propre rythme). Aligné sur le cache
// de la route.
const FEED_REFRESH_INTERVAL = "PT1H";

const encoder = new TextEncoder();

/**
 * Plie une ligne de contenu à 75 octets (RFC 5545 §3.1) : les lignes de
 * continuation commencent par une espace. Coupe sur des caractères entiers
 * pour ne jamais casser un caractère UTF-8 multi-octets.
 */
function foldLine(line: string): string {
  if (encoder.encode(line).length <= 75) return line;

  const parts: string[] = [];
  let current = "";
  let currentBytes = 0;
  for (const char of line) {
    const charBytes = encoder.encode(char).length;
    // 75 octets pour la première ligne, 74 + l'espace de tête pour les suivantes
    const limit = parts.length === 0 ? 75 : 74;
    if (currentBytes + charBytes > limit) {
      parts.push(current);
      current = "";
      currentBytes = 0;
    }
    current += char;
    currentBytes += charBytes;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

/**
 * Génère le flux iCalendar d'abonnement d'une Communauté : un VCALENDAR
 * contenant un VEVENT par événement. Destiné aux agendas abonnés (Google,
 * Apple, Outlook) et aux agrégateurs, qui le relisent périodiquement.
 *
 * Volontairement sans ORGANIZER ni lien visio : le flux est public et
 * republiable, il renvoie vers la page de l'événement pour s'inscrire.
 */
export function generateIcsFeed(data: IcsFeedData): string {
  const now = formatIcsDate(new Date());
  // Le texte saisi peut contenir des fins de ligne Windows (un CR brut
  // couperait la ligne) et des caractères de contrôle invisibles, collés
  // depuis Word ou un PDF, que RFC 5545 interdit : un analyseur strict
  // rejetterait alors tout le calendrier de la Communauté.
  const escape = (text: string) =>
    escapeIcsText(
      text.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "")
    );
  const calendarName = escape(data.calendarName);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Playground//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `NAME:${calendarName}`,
    `X-WR-CALNAME:${calendarName}`,
    `REFRESH-INTERVAL;VALUE=DURATION:${FEED_REFRESH_INTERVAL}`,
    `X-PUBLISHED-TTL:${FEED_REFRESH_INTERVAL}`,
  ];

  for (const event of data.events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}@theplayground`,
      `DTSTAMP:${now}`,
      `LAST-MODIFIED:${formatIcsDate(event.updatedAt)}`,
      `DTSTART:${formatIcsDate(event.startsAt)}`,
      `DTEND:${formatIcsDate(eventEnd(event.startsAt, event.endsAt))}`,
      `SUMMARY:${escape(event.title)}`,
      `DESCRIPTION:${escape(event.description)}`,
      ...(event.location ? [`LOCATION:${escape(event.location)}`] : []),
      `URL:${event.url}`,
      `STATUS:${event.cancelled ? "CANCELLED" : "CONFIRMED"}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
