export type CalendarEventData = {
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  locationType: string;
  locationName: string | null;
  locationAddress: string | null;
  circleName: string;
  slug: string;
};

function formatGoogleDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function formatLocation(data: CalendarEventData): string {
  if (data.locationType === "ONLINE") return "";
  return [data.locationName, data.locationAddress].filter(Boolean).join(", ");
}

export function buildGoogleCalendarUrl(
  data: CalendarEventData,
  appUrl: string
): string {
  const start = formatGoogleDate(data.startsAt);
  const end = formatGoogleDate(
    data.endsAt ?? new Date(data.startsAt.getTime() + 2 * 60 * 60 * 1000)
  );

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: data.title,
    dates: `${start}/${end}`,
    details: `Organisé par ${data.circleName} — The Playground\n\n${appUrl}/m/${data.slug}`,
    location: formatLocation(data),
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
