import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

// URLs Luma autorisées
const LUMA_URLS: Record<string, string> = {
  paris: "https://lu.ma/paris",
  lyon: "https://lu.ma/lyon",
  bordeaux: "https://lu.ma/bordeaux",
  marseille: "https://lu.ma/marseille",
  toulouse: "https://lu.ma/toulouse",
  nantes: "https://lu.ma/nantes",
  lille: "https://lu.ma/lille",
  strasbourg: "https://lu.ma/strasbourg",
  london: "https://lu.ma/london",
  berlin: "https://lu.ma/berlin",
  amsterdam: "https://lu.ma/amsterdam",
};

// URLs Meetup par ville — format: countryCode--City
const MEETUP_URLS: Record<string, string> = {
  paris: "https://www.meetup.com/find/events/?location=fr--Paris&source=EVENTS",
  lyon: "https://www.meetup.com/find/events/?location=fr--Lyon&source=EVENTS",
  bordeaux: "https://www.meetup.com/find/events/?location=fr--Bordeaux&source=EVENTS",
  marseille: "https://www.meetup.com/find/events/?location=fr--Marseille&source=EVENTS",
  toulouse: "https://www.meetup.com/find/events/?location=fr--Toulouse&source=EVENTS",
  nantes: "https://www.meetup.com/find/events/?location=fr--Nantes&source=EVENTS",
  lille: "https://www.meetup.com/find/events/?location=fr--Lille&source=EVENTS",
  strasbourg: "https://www.meetup.com/find/events/?location=fr--Strasbourg&source=EVENTS",
  london: "https://www.meetup.com/find/events/?location=gb--London&source=EVENTS",
  berlin: "https://www.meetup.com/find/events/?location=de--Berlin&source=EVENTS",
  amsterdam: "https://www.meetup.com/find/events/?location=nl--Amsterdam&source=EVENTS",
};

// Extrait uniquement la portion événements du __NEXT_DATA__ Luma
// pour éviter d'envoyer des centaines de KB à Claude
function extractLumaEvents(rawJson: string): string {
  try {
    const json = JSON.parse(rawJson) as Record<string, unknown>;
    const pageProps = (
      (json?.props as Record<string, unknown>)?.pageProps as Record<
        string,
        unknown
      >
    ) ?? {};

    // Chemins connus dans Luma selon le type de page
    const candidates = [
      pageProps?.initialData,
      pageProps?.events,
      pageProps?.data,
      pageProps?.initialEventList,
      pageProps?.calendarData,
    ].filter(Boolean);

    if (candidates.length > 0) {
      const compact = JSON.stringify(candidates[0]);
      // Max 12k chars — suffisant pour ~20-30 événements
      return compact.length > 12000
        ? compact.slice(0, 12000) + "...[truncated]"
        : compact;
    }

    // Fallback : pageProps sans les clés React internes
    const {
      _sentryTraceData,
      _sentryBaggage,
      __NEXT_DATA__,
      ...rest
    } = pageProps as Record<string, unknown>;
    void _sentryTraceData; void _sentryBaggage; void __NEXT_DATA__;
    const compact = JSON.stringify(rest);
    return compact.length > 12000
      ? compact.slice(0, 12000) + "...[truncated]"
      : compact;
  } catch {
    return rawJson.slice(0, 8000);
  }
}

// Extrait les données événements depuis une page Meetup
// Essaie __NEXT_DATA__ en premier, puis JSON-LD, puis Apollo state
function extractMeetupEvents(html: string): string {
  // 1. Essai __NEXT_DATA__ (Meetup est une app Next.js)
  const nextDataMatch = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
  );
  if (nextDataMatch) {
    try {
      const json = JSON.parse(nextDataMatch[1].trim()) as Record<string, unknown>;
      const pageProps =
        ((json?.props as Record<string, unknown>)?.pageProps as Record<string, unknown>) ?? {};

      // Chemins connus dans Meetup find/events
      const candidates = [
        (pageProps?.pagePayload as Record<string, unknown>)?.eventResults,
        pageProps?.eventSearch,
        pageProps?.searchResultsData,
        pageProps?.serverData,
        pageProps?.initialData,
      ].filter(Boolean);

      if (candidates.length > 0) {
        const compact = JSON.stringify(candidates[0]);
        return compact.length > 12000
          ? compact.slice(0, 12000) + "...[truncated]"
          : compact;
      }

      // Fallback : pageProps complet sans clés internes
      const { _sentryTraceData, _sentryBaggage, ...rest } = pageProps as Record<string, unknown>;
      void _sentryTraceData; void _sentryBaggage;
      const compact = JSON.stringify(rest);
      return compact.length > 12000
        ? compact.slice(0, 12000) + "...[truncated]"
        : compact;
    } catch { /* continue to next extraction */ }
  }

  // 2. JSON-LD structured data (souvent présent sur les pages d'événements)
  const jsonLdBlocks: string[] = [];
  const jsonLdRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = jsonLdRegex.exec(html)) !== null) {
    jsonLdBlocks.push(match[1].trim());
  }
  if (jsonLdBlocks.length > 0) {
    const combined = "[" + jsonLdBlocks.join(",") + "]";
    return combined.length > 12000
      ? combined.slice(0, 12000) + "...[truncated]"
      : combined;
  }

  // 3. Fallback : HTML nettoyé tronqué
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .slice(0, 8000);
}

async function fetchLumaPage(url: string): Promise<string> {
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

    if (!res.ok) {
      return JSON.stringify({ error: `HTTP ${res.status}`, url });
    }

    const html = await res.text();
    const match = html.match(
      /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
    );

    if (match) {
      return extractLumaEvents(match[1].trim());
    }

    // Pas de __NEXT_DATA__ — retourner HTML nettoyé tronqué
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .slice(0, 8000);
  } catch (err) {
    return JSON.stringify({
      error: err instanceof Error ? err.message : "fetch failed",
      url,
    });
  }
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

    if (!res.ok) {
      return JSON.stringify({ error: `HTTP ${res.status}`, url });
    }

    const html = await res.text();
    return extractMeetupEvents(html);
  } catch (err) {
    return JSON.stringify({
      error: err instanceof Error ? err.message : "fetch failed",
      url,
    });
  }
}

export async function POST(request: NextRequest) {
  const { ville, date, keywords } = (await request.json()) as {
    ville: string;
    date: string;
    keywords: string;
  };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY manquante dans .env.local" },
      { status: 500 }
    );
  }

  const lumaUrl = LUMA_URLS[ville.toLowerCase()] ?? `https://lu.ma/${ville.toLowerCase()}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        send({ type: "status", message: `Démarrage du radar — ${ville} — ${date}` });

        const meetupUrl = MEETUP_URLS[ville.toLowerCase()] ?? `https://www.meetup.com/find/events/?location=${ville.toLowerCase()}&source=EVENTS`;

        // Fetch Luma + Meetup en parallèle
        send({ type: "tool_call", message: `Fetching ${lumaUrl} + Meetup en parallèle…` });
        const [lumaContent, meetupContent] = await Promise.all([
          fetchLumaPage(lumaUrl),
          fetchMeetupPage(meetupUrl),
        ]);
        send({ type: "tool_result", message: `✓ Luma (${Math.round(lumaContent.length / 1024)}KB) + Meetup (${Math.round(meetupContent.length / 1024)}KB)` });

        // Claude analyse les deux sources en un seul appel
        const client = new Anthropic({ apiKey });

        const prompt = `Tu es un radar d'événements. Voici les données extraites de deux sources pour ${ville}.

=== SOURCE 1 : Luma (lu.ma/${ville}) ===
${lumaContent}

=== SOURCE 2 : Meetup ===
${meetupContent}

MISSION :
Trouve les événements correspondant à ces critères :
- Date cible : ${date}
- Mots-clés (logique OR) : ${keywords || "aucun filtre — garde tout"}${ville.toLowerCase() === "paris" ? "\n- Zone : Paris et Île-de-France" : ""}

INSTRUCTIONS :
1. Explore chaque source pour trouver les tableaux d'événements
2. Pour chaque événement, extrais : titre, date de début, heure, lieu, URL, description courte
3. Filtre sur la date ${date} (garde les événements dont start_at, date_start ou dateTime correspond à ce jour)
4. Si peu de résultats exacts, garde aussi les événements dans la semaine autour de ${date}
5. Pour les mots-clés : logique OR — garde un événement si son titre ou sa description contient AU MOINS UN des mots-clés (pas besoin de tous les avoir)
6. URLs Luma : format https://lu.ma/[slug]
7. URLs Meetup : format https://www.meetup.com/[group]/events/[id]/
8. Déduplique si un même événement apparaît dans les deux sources

RÈGLE ABSOLUE : réponds UNIQUEMENT avec le JSON brut ci-dessous. Zéro texte, zéro markdown, zéro explication. Commence par { et termine par }.

{"events":[{"title":"string","date":"YYYY-MM-DD","time":"HH:MM ou null","location":"lieu ou null","url":"https://...","source":"luma ou meetup","description":"1-2 phrases ou null"}],"summary":"X événements trouvés pour ${date} (Luma + Meetup)"}`;

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
            // Extrait le JSON de façon robuste :
            // 1. Cherche un bloc ```json ... ``` (Claude ajoute parfois du texte après)
            // 2. Sinon, cherche le premier { jusqu'au dernier }
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
