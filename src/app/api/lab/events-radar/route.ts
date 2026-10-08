import { NextRequest } from "next/server";
import { auth } from "@/infrastructure/auth/auth.config";
import {
  fetchAndFilterLumaEvents,
  fetchAndFilterEventbriteEvents,
  fetchMeetupEvents,
  deduplicateByUrl,
  LUMA_LOCATION_TERMS,
  EVENTBRITE_COUNTRY,
} from "@/lib/events-radar";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return Response.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { ville, dateFrom, dateTo, keywords } = (await request.json()) as {
    ville: string; dateFrom: string; dateTo: string; keywords: string;
  };
  const dateEnd = dateTo || dateFrom;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        const kwArray = keywords ? keywords.split(",").map((k) => k.trim()).filter(Boolean) : [];
        const locationTerms = LUMA_LOCATION_TERMS[ville.toLowerCase()] ?? [ville.toLowerCase()];
        const expectedCountry = EVENTBRITE_COUNTRY[ville.toLowerCase()] ?? "fr";

        const periodLabel = dateEnd === dateFrom ? dateFrom : `${dateFrom} → ${dateEnd}`;
        send({ type: "status", message: `Radar — ${ville} — ${periodLabel}` });
        send({ type: "status", message: "Fetching Luma + Eventbrite + Meetup en parallèle…" });

        const [lumaEvents, eventbriteEvents, meetupEvents] = await Promise.all([
          fetchAndFilterLumaEvents(ville, kwArray, dateFrom, dateEnd),
          fetchAndFilterEventbriteEvents(ville, dateFrom, dateEnd, locationTerms, expectedCountry, kwArray),
          fetchMeetupEvents(ville, EVENTBRITE_COUNTRY[ville.toLowerCase()], dateFrom, dateEnd, kwArray),
        ]);

        const allEvents = deduplicateByUrl([...lumaEvents, ...eventbriteEvents, ...meetupEvents]);
        allEvents.sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")));

        send({
          type: "status",
          message: `✓ Luma: ${lumaEvents.length} · Eventbrite: ${eventbriteEvents.length} · Meetup: ${meetupEvents.length}`,
        });

        send({
          type: "events",
          events: allEvents,
          summary: `${allEvents.length} événement(s) du ${dateFrom} au ${dateEnd} — ${lumaEvents.length} Luma · ${eventbriteEvents.length} Eventbrite · ${meetupEvents.length} Meetup`,
        });
        send({ type: "done" });
      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : "Erreur inconnue" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
