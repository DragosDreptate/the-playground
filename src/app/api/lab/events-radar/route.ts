import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const LUMA_URLS: Record<string, string[]> = {
  paris: ["https://lu.ma/paris"],
  lyon: ["https://lu.ma/lyon"],
  bordeaux: ["https://lu.ma/bordeaux"],
  marseille: ["https://lu.ma/marseille"],
  toulouse: ["https://lu.ma/toulouse"],
  nantes: ["https://lu.ma/nantes"],
  lille: ["https://lu.ma/lille"],
  strasbourg: ["https://lu.ma/strasbourg"],
  london: ["https://lu.ma/london"],
  berlin: ["https://lu.ma/berlin"],
  amsterdam: ["https://lu.ma/amsterdam"],
};

async function fetchPage(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return JSON.stringify({ error: `HTTP ${res.status}`, url });
    }

    const html = await res.text();

    // Luma (Next.js) — extraire __NEXT_DATA__
    const match = html.match(
      /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
    );
    if (match) {
      const raw = match[1].trim();
      // Truncate à 80k pour ne pas exploser le context
      return raw.length > 80000 ? raw.slice(0, 80000) + "\n...[truncated]" : raw;
    }

    // Fallback : HTML nettoyé + truncaté
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .slice(0, 30000);
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

  const client = new Anthropic({ apiKey });
  const lumaUrls = LUMA_URLS[ville.toLowerCase()] ?? [
    `https://lu.ma/${ville.toLowerCase()}`,
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        send({
          type: "status",
          message: `Démarrage du radar — ${ville} — ${date}`,
        });

        const systemPrompt = `Tu es un radar d'événements pour des organisateurs de communautés.

Ta mission : trouver des événements sur Luma correspondant aux critères donnés.

MÉTHODE :
1. Utilise fetch_page pour récupérer les URLs Luma fournies
2. Le résultat est le JSON brut de __NEXT_DATA__ (données Next.js internes de Luma)
3. Explore la structure JSON pour localiser les tableaux d'événements (cherche des clés comme "events", "initialEventList", "cards", dans props.pageProps ou similaire)
4. Filtre par date cible : ${date} (garde les événements dont la date de début correspond à ce jour)
5. Filtre par pertinence : ${keywords ? `mots-clés "${keywords}"` : "aucun filtre thématique — garde tout"}

SORTIE :
Réponds UNIQUEMENT avec un JSON valide, sans markdown, sans texte avant ou après :
{
  "events": [
    {
      "title": "string",
      "date": "YYYY-MM-DD",
      "time": "HH:MM ou null",
      "location": "adresse ou ville ou null",
      "url": "https://lu.ma/... URL complète de l'événement",
      "source": "luma",
      "description": "description courte (1-2 phrases) ou null"
    }
  ],
  "summary": "résumé court : X événements trouvés sur Y pages, filtrés par date/mots-clés"
}

Si aucun événement ne correspond, retourne { "events": [], "summary": "..." }.`;

        const messages: Anthropic.Messages.MessageParam[] = [
          {
            role: "user",
            content: `Critères de recherche :
- Ville : ${ville}${ville.toLowerCase() === "paris" ? " (Île-de-France)" : ""}
- Date cible : ${date}
- Mots-clés : ${keywords || "aucun filtre spécifique"}

Pages Luma à analyser : ${lumaUrls.join(", ")}

Fetche chaque page et extrait les événements correspondants.`,
          },
        ];

        const tools: Anthropic.Messages.Tool[] = [
          {
            name: "fetch_page",
            description:
              "Fetche une page web publique. Pour les sites Next.js comme Luma, retourne le contenu JSON de __NEXT_DATA__.",
            input_schema: {
              type: "object" as const,
              properties: {
                url: {
                  type: "string",
                  description:
                    "URL complète à fetcher (ex: https://lu.ma/paris)",
                },
              },
              required: ["url"],
            },
          },
        ];

        // Agent loop — max 6 itérations pour éviter les boucles infinies
        for (let i = 0; i < 6; i++) {
          const response = await client.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 4096,
            system: systemPrompt,
            tools,
            messages,
          });

          if (response.stop_reason === "tool_use") {
            const toolUseBlocks = response.content.filter(
              (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use"
            );

            const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

            for (const block of toolUseBlocks) {
              const url = (block.input as { url: string }).url;
              send({ type: "tool_call", message: `Fetching ${url}…` });

              const result = await fetchPage(url);
              send({ type: "tool_result", message: `✓ ${url}` });

              toolResults.push({
                type: "tool_result",
                tool_use_id: block.id,
                content: result,
              });
            }

            messages.push({ role: "assistant", content: response.content });
            messages.push({ role: "user", content: toolResults });
          } else {
            // Réponse finale
            const textBlock = response.content.find(
              (b): b is Anthropic.Messages.TextBlock => b.type === "text"
            );

            if (textBlock) {
              try {
                // Nettoyer les éventuels backticks markdown
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
                  message: "Impossible de parser la réponse de l'agent",
                  raw: textBlock.text.slice(0, 500),
                });
              }
            }
            break;
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
