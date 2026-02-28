import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

// --- Luma API ---
// Luma expose une API JSON publique — pas besoin de scraper le HTML

// Ville → nom de ville au format Luma (pour le paramètre `near`)
const LUMA_CITY: Record<string, string> = {
  paris: "Paris",
  lyon: "Lyon",
  bordeaux: "Bordeaux",
  marseille: "Marseille",
  toulouse: "Toulouse",
  nantes: "Nantes",
  lille: "Lille",
  strasbourg: "Strasbourg",
  london: "London",
  berlin: "Berlin",
  amsterdam: "Amsterdam",
};

type LumaEntry = {
  event: {
    name: string;
    start_at: string;
    url: string;
    geo_address_info?: { city_state?: string };
  };
  calendar?: { name?: string; description_short?: string };
};

async function fetchLumaEvents(ville: string, keywords: string): Promise<string> {
  try {
    const near = LUMA_CITY[ville.toLowerCase()] ?? ville;
    const params = new URLSearchParams({
      near,
      pagination_limit: "30",
    });
    if (keywords) params.set("query", keywords);

    const url = `https://api.lu.ma/discover/get-paginated-events?${params.toString()}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return JSON.stringify({ error: `Luma API HTTP ${res.status}` });
    }

    const json = (await res.json()) as { entries?: LumaEntry[] };
    const events = (json.entries ?? []).map((e) => ({
      name: e.event.name,
      start_at: e.event.start_at,
      url: `https://lu.ma/${e.event.url}`,
      location: e.event.geo_address_info?.city_state ?? null,
      calendar: e.calendar?.name ?? null,
    }));

    const compact = JSON.stringify(events);
    return compact.length > 12000 ? compact.slice(0, 12000) + "...[truncated]" : compact;
  } catch (err) {
    return JSON.stringify({ error: err instanceof Error ? err.message : "fetch failed" });
  }
}

// --- Meetup scraping ---
// Codes pays Meetup par ville (format countryCode--City)
const MEETUP_LOCATION: Record<string, string> = {
  paris: "fr--Paris",
  lyon: "fr--Lyon",
  bordeaux: "fr--Bordeaux",
  marseille: "fr--Marseille",
  toulouse: "fr--Toulouse",
  nantes: "fr--Nantes",
  lille: "fr--Lille",
  strasbourg: "fr--Strasbourg",
  london: "gb--London",
  berlin: "de--Berlin",
  amsterdam: "nl--Amsterdam",
};

// URL Meetup avec plage de dates + mots-clés pour que leur moteur filtre en amont
function buildMeetupUrl(ville: string, dateFrom: string, dateTo: string, keywords: string): string {
  const location = MEETUP_LOCATION[ville.toLowerCase()] ?? `fr--${ville}`;
  const params = new URLSearchParams({
    location,
    source: "EVENTS",
    startDateRange: dateFrom,
    endDateRange: dateTo || dateFrom,
  });
  if (keywords) params.set("keywords", keywords);
  return `https://www.meetup.com/find/events/?${params.toString()}`;
}

// Extrait les données événements depuis une page Meetup
// Essaie __NEXT_DATA__ en premier, puis JSON-LD
function extractMeetupEvents(html: string): string {
  // 1. __NEXT_DATA__ (Meetup est une app Next.js)
  const nextDataMatch = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
  );
  if (nextDataMatch) {
    try {
      const json = JSON.parse(nextDataMatch[1].trim()) as Record<string, unknown>;
      const pageProps =
        ((json?.props as Record<string, unknown>)?.pageProps as Record<string, unknown>) ?? {};

      const candidates = [
        (pageProps?.pagePayload as Record<string, unknown>)?.eventResults,
        pageProps?.eventSearch,
        pageProps?.searchResultsData,
        pageProps?.serverData,
        pageProps?.initialData,
      ].filter(Boolean);

      if (candidates.length > 0) {
        const compact = JSON.stringify(candidates[0]);
        return compact.length > 12000 ? compact.slice(0, 12000) + "...[truncated]" : compact;
      }

      const { _sentryTraceData, _sentryBaggage, ...rest } = pageProps as Record<string, unknown>;
      void _sentryTraceData; void _sentryBaggage;
      const compact = JSON.stringify(rest);
      return compact.length > 12000 ? compact.slice(0, 12000) + "...[truncated]" : compact;
    } catch { /* continue */ }
  }

  // 2. JSON-LD structured data
  const jsonLdBlocks: string[] = [];
  const jsonLdRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = jsonLdRegex.exec(html)) !== null) jsonLdBlocks.push(m[1].trim());
  if (jsonLdBlocks.length > 0) {
    const combined = "[" + jsonLdBlocks.join(",") + "]";
    return combined.length > 12000 ? combined.slice(0, 12000) + "...[truncated]" : combined;
  }

  // 3. Fallback HTML nettoyé
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .slice(0, 8000);
}

async function fetchMeetupPage(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return JSON.stringify({ error: `Meetup HTTP ${res.status}`, url });
    return extractMeetupEvents(await res.text());
  } catch (err) {
    return JSON.stringify({ error: err instanceof Error ? err.message : "fetch failed", url });
  }
}

// --- Route POST ---

export async function POST(request: NextRequest) {
  const { ville, dateFrom, dateTo, keywords } = (await request.json()) as {
    ville: string;
    dateFrom: string;
    dateTo: string;
    keywords: string;
  };
  const dateEnd = dateTo || dateFrom;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY manquante dans .env.local" },
      { status: 500 }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const periodLabel = dateEnd === dateFrom ? dateFrom : `${dateFrom} → ${dateEnd}`;
        send({ type: "status", message: `Démarrage du radar — ${ville} — ${periodLabel}` });

        const meetupUrl = buildMeetupUrl(ville, dateFrom, dateEnd, keywords);

        // Fetch Luma API + Meetup en parallèle
        send({ type: "tool_call", message: `Fetching Luma API + Meetup en parallèle…` });
        const [lumaContent, meetupContent] = await Promise.all([
          fetchLumaEvents(ville, keywords),
          fetchMeetupPage(meetupUrl),
        ]);
        send({
          type: "tool_result",
          message: `✓ Luma API (${Math.round(lumaContent.length / 1024)}KB) + Meetup (${Math.round(meetupContent.length / 1024)}KB)`,
        });

        // Claude analyse les deux sources en un seul appel
        const client = new Anthropic({ apiKey });

        const prompt = `Tu es un radar d'événements. Voici les données de deux sources pour ${ville}.

=== SOURCE 1 : Luma API ===
Tableau JSON d'événements (champs : name, start_at ISO8601, url, location, calendar) :
${lumaContent}

=== SOURCE 2 : Meetup ===
${meetupContent}

MISSION :
Trouve les événements correspondant à ces critères :
- Période : du ${dateFrom} au ${dateEnd} inclus
- Mots-clés (logique OR) : ${keywords || "aucun filtre — garde tout"}${ville.toLowerCase() === "paris" ? "\n- Zone : Paris et Île-de-France" : ""}

INSTRUCTIONS :
1. SOURCE 1 Luma : chaque objet a start_at (ISO8601), name, url (déjà complet https://lu.ma/...)
2. SOURCE 2 Meetup : cherche les tableaux d'événements, extrais titre, date, heure, lieu, URL
3. Filtre sur la période — garde les événements dont start_at ou dateTime est entre ${dateFrom} et ${dateEnd} inclus
4. Mots-clés OR — garde si le titre ou la description contient AU MOINS UN des mots-clés
5. URLs Meetup : format https://www.meetup.com/[group]/events/[id]/
6. Déduplique si un même événement apparaît dans les deux sources

RÈGLE ABSOLUE : réponds UNIQUEMENT avec le JSON brut. Zéro texte, zéro markdown. Commence par { et termine par }.

{"events":[{"title":"string","date":"YYYY-MM-DD","time":"HH:MM ou null","location":"lieu ou null","url":"https://...","source":"luma ou meetup","description":"1-2 phrases ou null"}],"summary":"X événements trouvés du ${dateFrom} au ${dateEnd} (Luma + Meetup)"}`;

        send({ type: "status", message: "Analyse par Claude…" });

        const response = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 2048,
          messages: [{ role: "user", content: prompt }],
        });

        const textBlock = response.content.find(
          (b): b is Anthropic.Messages.TextBlock => b.type === "text"
        );

        if (textBlock) {
          try {
            const raw = textBlock.text;
            const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
            const clean = codeBlock
              ? codeBlock[1].trim()
              : (() => {
                  const first = raw.indexOf("{");
                  const last = raw.lastIndexOf("}");
                  return first !== -1 && last !== -1
                    ? raw.slice(first, last + 1)
                    : raw.trim();
                })();
            const parsed = JSON.parse(clean) as {
              events: unknown[];
              summary: string;
            };
            send({
              type: "events",
              events: parsed.events ?? [],
              summary: parsed.summary ?? "",
            });
          } catch {
            send({
              type: "error",
              message: "Impossible de parser la réponse de Claude",
              raw: textBlock.text.slice(0, 500),
            });
          }
        }

        send({ type: "done" });
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : "Erreur inconnue",
        });
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
