import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

// --- Types ---

type EventResult = {
  title: string;
  date: string;
  time: string | null;
  location: string | null;
  url: string;
  source: string;
  description: string | null;
};

// --- Luma API — traitement 100% côté serveur, 0 token Claude ---

const LUMA_CITY: Record<string, string> = {
  paris: "Paris", lyon: "Lyon", bordeaux: "Bordeaux", marseille: "Marseille",
  toulouse: "Toulouse", nantes: "Nantes", lille: "Lille", strasbourg: "Strasbourg",
  london: "London", berlin: "Berlin", amsterdam: "Amsterdam",
};

// Termes de localisation acceptables par ville (insensible à la casse)
// Un événement sans localisation (online) passe toujours
const LUMA_LOCATION_TERMS: Record<string, string[]> = {
  paris: ["paris", "île-de-france", "ile-de-france"],
  lyon: ["lyon", "auvergne"],
  bordeaux: ["bordeaux", "gironde"],
  marseille: ["marseille", "bouches-du-rhône", "bouches-du-rhone"],
  toulouse: ["toulouse", "haute-garonne"],
  nantes: ["nantes", "loire-atlantique"],
  lille: ["lille", "nord"],
  strasbourg: ["strasbourg", "bas-rhin", "alsace"],
  london: ["london"],
  berlin: ["berlin"],
  amsterdam: ["amsterdam"],
};

type LumaEntry = {
  event: { name: string; start_at: string; url: string; geo_address_info?: { city_state?: string } };
  calendar?: { name?: string };
};

async function fetchAndFilterLumaEvents(
  ville: string,
  keywords: string,
  dateFrom: string,
  dateEnd: string
): Promise<EventResult[]> {
  try {
    const params = new URLSearchParams({ near: LUMA_CITY[ville.toLowerCase()] ?? ville, pagination_limit: "50" });
    if (keywords) params.set("query", keywords);
    const res = await fetch(`https://api.lu.ma/discover/get-paginated-events?${params}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];

    const json = (await res.json()) as { entries?: LumaEntry[] };
    const kwList = keywords ? keywords.toLowerCase().split(/[\s,]+/).filter(Boolean) : [];
    const locationTerms = LUMA_LOCATION_TERMS[ville.toLowerCase()] ?? [ville.toLowerCase()];

    return (json.entries ?? [])
      .filter((e) => {
        // Filtre date
        const d = e.event.start_at.slice(0, 10);
        if (d < dateFrom || d > dateEnd) return false;
        // Filtre localisation — si renseignée, doit correspondre à la ville
        // Les événements sans localisation (online) passent toujours
        const loc = e.event.geo_address_info?.city_state?.toLowerCase();
        if (loc && !locationTerms.some((t) => loc.includes(t))) return false;
        // Filtre mots-clés OR
        if (kwList.length === 0) return true;
        const text = e.event.name.toLowerCase();
        return kwList.some((kw) => text.includes(kw));
      })
      .map((e) => ({
        title: e.event.name,
        date: e.event.start_at.slice(0, 10),
        time: e.event.start_at.slice(11, 16) || null,
        location: e.event.geo_address_info?.city_state ?? null,
        url: `https://lu.ma/${e.event.url}`,
        source: "luma",
        description: e.calendar?.name ?? null,
      }));
  } catch {
    return [];
  }
}

// --- Eventbrite — scraping + extraction Claude (fusionné avec Meetup) ---

// Format Eventbrite : country--city (lowercase, tirets)
const EVENTBRITE_LOCATION: Record<string, string> = {
  paris: "france--paris", lyon: "france--lyon", bordeaux: "france--bordeaux",
  marseille: "france--marseille", toulouse: "france--toulouse", nantes: "france--nantes",
  lille: "france--lille", strasbourg: "france--strasbourg",
  london: "united-kingdom--london", berlin: "germany--berlin", amsterdam: "netherlands--amsterdam",
};

function buildEventbriteUrl(ville: string, dateFrom: string, dateEnd: string, keywords: string): string {
  const location = EVENTBRITE_LOCATION[ville.toLowerCase()] ?? `france--${ville.toLowerCase()}`;
  const params = new URLSearchParams({
    start_date: dateFrom,
    end_date: dateEnd,
  });
  if (keywords) params.set("q", keywords);
  return `https://www.eventbrite.fr/d/${location}/events/?${params}`;
}

function extractEventbriteData(html: string): string {
  // 1. window.__SERVER_DATA__ (données principales Eventbrite)
  const sdMatch = html.match(/window\.__SERVER_DATA__\s*=\s*(\{[\s\S]*?\});\s*(?:<\/script>|window\.)/);
  if (sdMatch) {
    try {
      const json = JSON.parse(sdMatch[1]) as Record<string, unknown>;
      const searchEvents = (json?.search_data as Record<string, unknown>)?.events as Record<string, unknown> | undefined;
      const results =
        searchEvents?.results ??
        (json?.events as unknown[]) ??
        json?.data;
      if (results) {
        const s = JSON.stringify(results);
        return s.length > 10000 ? s.slice(0, 10000) + "…" : s;
      }
    } catch { /* next */ }
  }
  // 2. JSON-LD
  const blocks: string[] = [];
  html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi, (_, b) => { blocks.push(b); return ""; });
  if (blocks.length) {
    const s = "[" + blocks.join(",") + "]";
    return s.length > 10000 ? s.slice(0, 10000) + "…" : s;
  }
  // 3. HTML nettoyé
  return html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").slice(0, 6000);
}

async function fetchEventbriteData(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return "";
    return extractEventbriteData(await res.text());
  } catch {
    return "";
  }
}

// --- Meetup — scraping + extraction Claude ---

const MEETUP_LOCATION: Record<string, string> = {
  paris: "fr--Paris", lyon: "fr--Lyon", bordeaux: "fr--Bordeaux", marseille: "fr--Marseille",
  toulouse: "fr--Toulouse", nantes: "fr--Nantes", lille: "fr--Lille", strasbourg: "fr--Strasbourg",
  london: "gb--London", berlin: "de--Berlin", amsterdam: "nl--Amsterdam",
};

function buildMeetupUrl(ville: string, dateFrom: string, dateEnd: string, keywords: string): string {
  const params = new URLSearchParams({
    location: MEETUP_LOCATION[ville.toLowerCase()] ?? `fr--${ville}`,
    source: "EVENTS",
    startDateRange: dateFrom,
    endDateRange: dateEnd,
  });
  if (keywords) params.set("keywords", keywords);
  return `https://www.meetup.com/find/events/?${params}`;
}

function extractMeetupData(html: string): string {
  // 1. __NEXT_DATA__
  const nd = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (nd) {
    try {
      const pp = (((JSON.parse(nd[1]) as Record<string, unknown>)?.props as Record<string, unknown>)?.pageProps ?? {}) as Record<string, unknown>;
      const hit = [(pp?.pagePayload as Record<string, unknown>)?.eventResults, pp?.eventSearch, pp?.searchResultsData, pp?.serverData].find(Boolean);
      if (hit) {
        const s = JSON.stringify(hit);
        return s.length > 10000 ? s.slice(0, 10000) + "…" : s;
      }
    } catch { /* next */ }
  }
  // 2. JSON-LD
  const blocks: string[] = [];
  html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi, (_, b) => { blocks.push(b); return ""; });
  if (blocks.length) {
    const s = "[" + blocks.join(",") + "]";
    return s.length > 10000 ? s.slice(0, 10000) + "…" : s;
  }
  // 3. HTML nettoyé
  return html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").slice(0, 6000);
}

async function fetchMeetupData(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return "";
    return extractMeetupData(await res.text());
  } catch {
    return "";
  }
}

// --- Route POST ---

export async function POST(request: NextRequest) {
  const { ville, dateFrom, dateTo, keywords } = (await request.json()) as {
    ville: string; dateFrom: string; dateTo: string; keywords: string;
  };
  const dateEnd = dateTo || dateFrom;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "ANTHROPIC_API_KEY manquante" }, { status: 500 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        const periodLabel = dateEnd === dateFrom ? dateFrom : `${dateFrom} → ${dateEnd}`;
        send({ type: "status", message: `Radar — ${ville} — ${periodLabel}` });

        send({ type: "tool_call", message: "Fetching Luma API + Meetup + Eventbrite en parallèle…" });
        const [lumaEvents, meetupRaw, eventbriteRaw] = await Promise.all([
          fetchAndFilterLumaEvents(ville, keywords, dateFrom, dateEnd),
          fetchMeetupData(buildMeetupUrl(ville, dateFrom, dateEnd, keywords)),
          fetchEventbriteData(buildEventbriteUrl(ville, dateFrom, dateEnd, keywords)),
        ]);
        send({
          type: "tool_result",
          message: `✓ Luma : ${lumaEvents.length} evt · Meetup : ${Math.round(meetupRaw.length / 1024)}KB · Eventbrite : ${Math.round(eventbriteRaw.length / 1024)}KB`,
        });

        // Luma est déjà prêt — 0 token Claude
        // Claude traite Meetup + Eventbrite en un seul appel
        let scrapedEvents: EventResult[] = [];
        const hasMeetup = meetupRaw.length > 50;
        const hasEventbrite = eventbriteRaw.length > 50;

        if (hasMeetup || hasEventbrite) {
          send({ type: "status", message: "Claude extrait Meetup + Eventbrite…" });
          const client = new Anthropic({ apiKey });

          const kw = keywords || "tous";
          const sections = [
            hasMeetup ? `[MEETUP]\n${meetupRaw}` : null,
            hasEventbrite ? `[EVENTBRITE]\n${eventbriteRaw}` : null,
          ].filter(Boolean).join("\n\n");

          const prompt = `${ville} ${dateFrom}→${dateEnd} mots-clés OR: ${kw}
Données (source entre crochets):
${sections}
JSON UNIQUEMENT:{"events":[{"title":"...","date":"YYYY-MM-DD","time":"HH:MM|null","location":"...|null","url":"https://...","source":"meetup|eventbrite","description":"...|null"}]}`;

          const resp = await client.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 1500,
            messages: [{ role: "user", content: prompt }],
          });

          const tb = resp.content.find((b): b is Anthropic.Messages.TextBlock => b.type === "text");
          if (tb) {
            try {
              const raw = tb.text;
              const cb = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
              const clean = cb ? cb[1].trim() : raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
              const parsed = JSON.parse(clean) as { events: EventResult[] };
              const kwList = keywords ? keywords.toLowerCase().split(/[\s,]+/).filter(Boolean) : [];
              scrapedEvents = (parsed.events ?? []).filter((e) => {
                if (!e.date || e.date < dateFrom || e.date > dateEnd) return false;
                if (kwList.length === 0) return true;
                return kwList.some((kw) => e.title.toLowerCase().includes(kw));
              });
            } catch { /* ignore parse error */ }
          }
        }

        const meetupCount = scrapedEvents.filter((e) => e.source === "meetup").length;
        const eventbriteCount = scrapedEvents.filter((e) => e.source === "eventbrite").length;
        const allEvents = [...lumaEvents, ...scrapedEvents];
        send({
          type: "events",
          events: allEvents,
          summary: `${allEvents.length} événement(s) du ${dateFrom} au ${dateEnd} — ${lumaEvents.length} Luma · ${meetupCount} Meetup · ${eventbriteCount} Eventbrite`,
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
