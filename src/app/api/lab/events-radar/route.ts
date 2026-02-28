import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

// URLs Luma autorisées — Claude ne peut fetcher QUE celles-ci
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

        // Fetch la page AVANT d'appeler Claude — pas de tool use nécessaire
        send({ type: "tool_call", message: `Fetching ${lumaUrl}…` });
        const pageContent = await fetchLumaPage(lumaUrl);
        send({ type: "tool_result", message: `✓ ${lumaUrl} (${Math.round(pageContent.length / 1024)}KB extraits)` });

        // Claude analyse uniquement le contenu pré-extrait — 0 tool call
        const client = new Anthropic({ apiKey });

        const prompt = `Tu es un radar d'événements. Voici les données JSON extraites de la page Luma pour ${ville}.

Données Luma (JSON partiel) :
${pageContent}

MISSION :
Trouve les événements correspondant à ces critères :
- Date cible : ${date}
- Mots-clés : ${keywords || "aucun filtre — garde tout"}${ville.toLowerCase() === "paris" ? "\n- Zone : Paris et Île-de-France" : ""}

INSTRUCTIONS :
1. Explore la structure JSON pour trouver les tableaux d'événements
2. Pour chaque événement, extrais : titre, date de début, heure, lieu, URL, description courte
3. Filtre sur la date ${date} (garde les événements dont start_at ou date_start correspond à ce jour)
4. Si peu de résultats exacts, garde aussi les événements dans la semaine autour de ${date}
5. Les URLs d'événements Luma sont au format https://lu.ma/[slug]

SORTIE — JSON uniquement, aucun texte avant ou après :
{
  "events": [
    {
      "title": "string",
      "date": "YYYY-MM-DD",
      "time": "HH:MM ou null",
      "location": "lieu ou null",
      "url": "https://lu.ma/...",
      "source": "luma",
      "description": "1-2 phrases ou null"
    }
  ],
  "summary": "X événements trouvés pour ${date} sur lu.ma/${ville}"
}`;

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
            const clean = textBlock.text
              .replace(/^```json\s*/i, "")
              .replace(/```\s*$/i, "")
              .trim();
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
