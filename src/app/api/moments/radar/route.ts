import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { auth } from "@/infrastructure/auth/auth.config";
import { prisma } from "@/infrastructure/db/prisma";
import { UserRole } from "@prisma/client";
import { createFastTextCall } from "@/infrastructure/services/ai/fast-model";

import {
  fetchAndFilterLumaEvents,
  fetchAndFilterEventbriteEvents,
  fetchMeetupEvents,
  extractKeywordsAndCity,
  deduplicateByUrl,
  getWeekRange,
  LUMA_LOCATION_TERMS,
  EVENTBRITE_COUNTRY,
} from "@/lib/events-radar";

const DAILY_LIMIT = 25;

type RadarRequest = {
  title: string;
  description: string;
  locationName: string;
  locationAddress: string;
  startsAt: string; // ISO date string
  overrideKeywords?: string[]; // when user edits keywords and relaunches
};

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
        const aiCall = createFastTextCall(new Anthropic({ apiKey }));

        // Étape 1 : extraction mots-clés + ville via Claude Haiku
        // Si overrideKeywords fournis, on saute l'extraction (re-lancement après édition)
        let keywords: string[];
        let city: string | null;

        if (overrideKeywords) {
          // Ville extraite depuis le champ adresse même pour le re-lancement
          const extracted = await extractKeywordsAndCity(aiCall, title, description, locationName, locationAddress);
          keywords = overrideKeywords;
          city = extracted.city;
        } else {
          const extracted = await extractKeywordsAndCity(aiCall, title, description, locationName, locationAddress);
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
        const locationTerms = LUMA_LOCATION_TERMS[city.toLowerCase()] ?? [city.toLowerCase()];
        const expectedCountry = EVENTBRITE_COUNTRY[city.toLowerCase()] ?? "fr";

        // Étape 3 : fetches parallèles sur la semaine complète — un appel par mot-clé (OR)
        const [lumaEvents, eventbriteEvents, meetupEvents] = await Promise.all([
          fetchAndFilterLumaEvents(city, keywords, weekFrom, weekTo),
          fetchAndFilterEventbriteEvents(city, weekFrom, weekTo, locationTerms, expectedCountry, keywords),
          fetchMeetupEvents(city, expectedCountry, weekFrom, weekTo, keywords),
        ]);

        const allEvents = deduplicateByUrl([...lumaEvents, ...eventbriteEvents, ...meetupEvents]);

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
