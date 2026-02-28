"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ExternalLink,
  MapPin,
  Calendar,
  Loader2,
  Radio,
  Clock,
} from "lucide-react";

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

type StreamEvent =
  | { type: "status"; message: string }
  | { type: "tool_call"; message: string }
  | { type: "tool_result"; message: string }
  | { type: "events"; events: EventResult[]; summary: string }
  | { type: "error"; message: string; raw?: string }
  | { type: "done" };

// --- Config ---

const CITIES = [
  { value: "paris", label: "Paris (Île-de-France)" },
  { value: "lyon", label: "Lyon" },
  { value: "bordeaux", label: "Bordeaux" },
  { value: "marseille", label: "Marseille" },
  { value: "toulouse", label: "Toulouse" },
  { value: "nantes", label: "Nantes" },
  { value: "lille", label: "Lille" },
  { value: "strasbourg", label: "Strasbourg" },
  { value: "london", label: "London" },
  { value: "berlin", label: "Berlin" },
  { value: "amsterdam", label: "Amsterdam" },
];

// --- Page ---

export default function EventsRadarPage() {
  const [ville, setVille] = useState("paris");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [keywords, setKeywords] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [events, setEvents] = useState<EventResult[]>([]);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");

  const addLog = (msg: string) => setLogs((prev) => [...prev, msg]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLogs([]);
    setEvents([]);
    setSummary("");
    setError("");

    try {
      const res = await fetch("/api/lab/events-radar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ville, dateFrom, dateTo, keywords }),
      });

      if (!res.body) throw new Error("Pas de corps dans la réponse");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          if (!chunk.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(chunk.slice(6)) as StreamEvent;
            switch (event.type) {
              case "status":
              case "tool_call":
              case "tool_result":
                addLog(event.message);
                break;
              case "events":
                setEvents(event.events);
                setSummary(event.summary);
                addLog(`✅ ${event.events.length} événement(s) trouvé(s)`);
                break;
              case "error":
                setError(event.message);
                if (event.raw) addLog(`Réponse brute : ${event.raw}`);
                break;
              case "done":
                break;
            }
          } catch {
            // chunk malformé — on ignore
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-4xl px-4 py-12">

        {/* Header */}
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2">
            <Radio className="text-primary size-4" />
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Lab — POC
            </span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">
            Radar d&apos;événements
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Agent IA — Luma + Meetup via Claude · <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">/lab/events-radar</code>
          </p>
        </div>

        {/* Formulaire */}
        <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">

              <div className="space-y-1.5">
                <Label>Ville</Label>
                <Select value={ville} onValueChange={setVille}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CITIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Du</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    if (dateTo && e.target.value > dateTo) setDateTo(e.target.value);
                  }}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Au</Label>
                <Input
                  type="date"
                  value={dateTo}
                  min={dateFrom}
                  onChange={(e) => setDateTo(e.target.value)}
                  placeholder={dateFrom}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Mots-clés</Label>
                <Input
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="tech, startup, design…"
                />
              </div>
            </div>

            <Button type="submit" disabled={isLoading || !dateFrom}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Analyse en cours…
                </>
              ) : (
                "Lancer le radar"
              )}
            </Button>
          </form>
        </div>

        {/* Console de l'agent (streaming) */}
        {logs.length > 0 && (
          <div className="mb-6 max-h-52 overflow-y-auto rounded-xl bg-zinc-900 p-4 font-mono text-xs">
            {logs.map((log, i) => (
              <div key={i} className="text-zinc-300">
                <span className="mr-2 text-zinc-600">›</span>
                {log}
              </div>
            ))}
            {isLoading && (
              <div className="animate-pulse text-zinc-500">
                <span className="mr-2">›</span>En attente de Claude…
              </div>
            )}
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Résultats */}
        {summary && (
          <p className="mb-4 text-sm italic text-zinc-500">{summary}</p>
        )}

        {events.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {events.map((event, i) => (
              <EventCard key={i} event={event} />
            ))}
          </div>
        )}

        {!isLoading && events.length === 0 && logs.length > 0 && !error && (
          <div className="py-16 text-center text-sm text-zinc-400">
            Aucun événement trouvé pour ces critères.
          </div>
        )}

      </div>
    </div>
  );
}

// --- Composant carte ---

function EventCard({ event }: { event: EventResult }) {
  return (
    <div className="flex flex-col rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300">

      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-900">
          {event.title}
        </h3>
        <Badge variant="outline" className="shrink-0 text-[10px] capitalize">
          {event.source}
        </Badge>
      </div>

      {/* Métadonnées */}
      <div className="mb-3 space-y-1">
        {(event.date || event.time) && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Calendar className="size-3 shrink-0" />
            <span>
              {event.date}
              {event.time && (
                <>
                  {" "}
                  <Clock className="mb-0.5 inline size-2.5" /> {event.time}
                </>
              )}
            </span>
          </div>
        )}
        {event.location && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <MapPin className="size-3 shrink-0" />
            <span className="line-clamp-1">{event.location}</span>
          </div>
        )}
      </div>

      {/* Description */}
      {event.description && (
        <p className="mb-3 line-clamp-2 text-xs text-zinc-400">
          {event.description}
        </p>
      )}

      {/* CTA */}
      <div className="mt-auto">
        <a
          href={event.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline"
        >
          Voir l&apos;événement
          <ExternalLink className="size-3" />
        </a>
      </div>
    </div>
  );
}
