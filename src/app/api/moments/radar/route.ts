import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { auth } from "@/infrastructure/auth/auth.config";
import { prisma } from "@/infrastructure/db/prisma";
import { UserRole } from "@prisma/client";

const DAILY_LIMIT = 10;
import {
  fetchAndFilterLumaEvents,
  fetchAndFilterEventbriteEvents,
  fetchAndFilterMobilizonEvents,
  fetchMeetupData,
  buildEventbriteUrl,
  buildMeetupUrl,
  getWeekRange,
  LUMA_LOCATION_TERMS,
  EVENTBRITE_COUNTRY,
  type EventResult,
} from "@/lib/events-radar";

const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";

type RadarRequest = {
  title: string;
  description: string;
  locationName: string;
  locationAddress: string;
  startsAt: string; // ISO date string
  overrideKeywords?: string[]; // when user edits keywords and relaunches
};

async function extractKeywordsAndCity(
  client: Anthropic,
  title: string,
  description: string,
  locationName: string,
  locationAddress: string
): Promise<{ keywords: string[]; city: string | null; country: string | null }> {
  const prompt = `Analyse cet événement et extrais les informations demandées.

Titre : ${title}
Description : ${description || "(vide)"}
Lieu : ${locationName || "(vide)"}
Adresse : ${locationAddress || "(vide)"}

Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour :
{
  "keywords": ["mot1", "mot2", "mot3"],
  "city": "NomDeVille ou null si introuvable",
  "country": "fr ou en ou de ou nl ou es, null si inconnu"
}

Règles :
- keywords : 2 à 5 mots-clés thématiques de l'événement (ex: "tech", "startup", "yoga", "photo")
- city : ville principale extraite de l'adresse ou du nom de lieu. null si impossible à déterminer
- country : code pays ISO 2 lettres (fr, gb, de, nl, es...). null si inconnu`;

  const resp = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 200,
    messages: [{ role: "user", content: prompt }],
  });

  const tb = resp.content.find((b): b is Anthropic.Messages.TextBlock => b.type === "text");
  if (!tb) return { keywords: [], city: null, country: null };

  try {
    const raw = tb.text.trim();
    const jsonStr = raw.startsWith("{") ? raw : raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
    const parsed = JSON.parse(jsonStr) as { keywords?: string[]; city?: string | null; country?: string | null };
    return {
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords.filter(Boolean) : [],
      city: parsed.city ?? null,
      country: parsed.country ?? null,
    };
  } catch {
    return { keywords: [], city: null, country: null };
  }
}

async function extractMeetupEventsWithClaude(
  client: Anthropic,
  meetupRaw: string,
  ville: string,
  dateFrom: string,
  dateEnd: string,
  keywords: string
): Promise<EventResult[]> {
  if (meetupRaw.length < 50) return [];

  const kw = keywords || "tous";
  const prompt = `Meetup ${ville} ${dateFrom}→${dateEnd} mots-clés OR: ${kw}
Données:
${meetupRaw}
JSON UNIQUEMENT:{"events":[{"title":"...","date":"YYYY-MM-DD","time":"HH:MM|null","location":"...|null","url":"https://meetup.com/...","source":"meetup","description":"...|null"}]}`;

  const resp = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const tb = resp.content.find((b): b is Anthropic.Messages.TextBlock => b.type === "text");
  if (!tb) return [];

  try {
    const raw = tb.text;
    const cb = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const clean = cb ? cb[1].trim() : raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
    const parsed = JSON.parse(clean) as { events: EventResult[] };
    const kwList = keywords ? keywords.toLowerCase().split(/[\s,]+/).filter(Boolean) : [];
    return (parsed.events ?? []).filter((e) => {
      if (!e.date || e.date < dateFrom || e.date > dateEnd) return false;
      if (kwList.length === 0) return true;
      return kwList.some((kw) => e.title.toLowerCase().includes(kw));
    });
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { title, description, locationName, locationAddress, startsAt, overrideKeywords } =
    (await request.json()) as RadarRequest;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "ANTHROPIC_API_KEY manquante" }, { status: 500 });
  }

  // Rate limiting — skip pour les admins
  const isAdmin = session.user.role === UserRole.ADMIN;
  if (!isAdmin) {
    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD" UTC
    const usage = await prisma.radarUsage.upsert({
      where: { userId_date: { userId: session.user.id, date: today } },
      create: { userId: session.user.id, date: today, count: 1 },
      update: { count: { increment: 1 } },
    });
    if (usage.count > DAILY_LIMIT) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error_rate_limit", limit: DAILY_LIMIT })}\n\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
          controller.close();
        },
      });
      return new Response(stream, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "X-Accel-Buffering": "no" },
      });
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        const client = new Anthropic({ apiKey });

        // Étape 1 : extraction mots-clés + ville via Claude Haiku
        // Si overrideKeywords fournis, on saute l'extraction (re-lancement après édition)
        let keywords: string[];
        let city: string | null;

        if (overrideKeywords) {
          // Ville extraite depuis le champ adresse même pour le re-lancement
          const extracted = await extractKeywordsAndCity(client, title, description, locationName, locationAddress);
          keywords = overrideKeywords;
          city = extracted.city;
        } else {
          const extracted = await extractKeywordsAndCity(client, title, description, locationName, locationAddress);
          keywords = extracted.keywords;
          city = extracted.city;
        }

        send({ type: "keywords", keywords, city });

        // Si ville non détectée → impossible de lancer les recherches
        if (!city) {
          send({ type: "error_no_city" });
          send({ type: "done" });
          return;
        }

        // Étape 2 : déterminer les plages de dates
        const dateStr = startsAt.slice(0, 10);
        const { weekFrom, weekTo } = getWeekRange(dateStr);
        const keywordsStr = keywords.join(" ");
        const locationTerms = LUMA_LOCATION_TERMS[city.toLowerCase()] ?? [city.toLowerCase()];
        const expectedCountry = EVENTBRITE_COUNTRY[city.toLowerCase()] ?? "fr";

        // Étape 3 : fetches parallèles sur la semaine complète
        const [lumaEvents, eventbriteEvents, meetupRaw, mobilizonEvents] = await Promise.all([
          fetchAndFilterLumaEvents(city, keywordsStr, weekFrom, weekTo),
          fetchAndFilterEventbriteEvents(
            buildEventbriteUrl(city, weekFrom, weekTo, keywordsStr),
            weekFrom,
            weekTo,
            locationTerms,
            expectedCountry,
            keywordsStr
          ),
          fetchMeetupData(buildMeetupUrl(city, weekFrom, weekTo, keywordsStr)),
          fetchAndFilterMobilizonEvents(city, keywordsStr, weekFrom, weekTo),
        ]);

        const meetupEvents = await extractMeetupEventsWithClaude(
          client,
          meetupRaw,
          city,
          weekFrom,
          weekTo,
          keywordsStr
        );

        const allEvents = [...lumaEvents, ...eventbriteEvents, ...meetupEvents, ...mobilizonEvents];

        // Trier par date
        allEvents.sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")));

        send({
          type: "events",
          events: allEvents,
          dateFrom: weekFrom,
          dateTo: weekTo,
          targetDate: dateStr,
        });
        send({ type: "done" });
      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : "Erreur inconnue" });
        send({ type: "done" });
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
