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
  url: string; // Public URL of the Moment
  organizerName: string; // Circle name
};

function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function generateIcs(data: IcsEventData): string {
  const dtStart = formatIcsDate(data.startsAt);
  const dtEnd = formatIcsDate(
    data.endsAt ?? new Date(data.startsAt.getTime() + 2 * 60 * 60 * 1000)
  );
  const now = formatIcsDate(new Date());

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Playground//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${data.uid}@theplayground`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(data.title)}`,
    `DESCRIPTION:${escapeIcsText(data.description)}`,
    `LOCATION:${escapeIcsText(data.location)}`,
    `URL:${data.url}`,
    `ORGANIZER;CN=${escapeIcsText(data.organizerName)}:MAILTO:noreply@theplayground.community`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
