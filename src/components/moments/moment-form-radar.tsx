"use client";

import { useState, useRef } from "react";
import { Radar, X, ExternalLink, Pencil, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EventResult } from "@/lib/events-radar";

// --- Types SSE ---

type RadarSSEEvent =
  | { type: "keywords"; keywords: string[]; city: string | null }
  | { type: "events"; events: EventResult[]; dateFrom: string; dateTo: string; targetDate: string }
  | { type: "error_no_city" }
  | { type: "error"; message: string }
  | { type: "done" };

// --- Badge source ---

const SOURCE_STYLES: Record<string, string> = {
  luma: "bg-violet-100 text-violet-700 border-violet-200",
  eventbrite: "bg-orange-100 text-orange-700 border-orange-200",
  meetup: "bg-red-100 text-red-700 border-red-200",
  mobilizon: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

function SourceBadge({ source }: { source: string }) {
  const cls = SOURCE_STYLES[source] ?? "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {source}
    </span>
  );
}

// --- Event card ---

function EventCard({ event }: { event: EventResult }) {
  return (
    <a
      href={event.url}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:bg-muted/50 group flex items-start gap-3 rounded-lg border p-3 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <SourceBadge source={event.source} />
          {event.time && (
            <span className="text-muted-foreground text-xs">{event.time}</span>
          )}
        </div>
        <p className="mt-1 text-sm font-medium leading-snug">{event.title}</p>
        {event.location && (
          <p className="text-muted-foreground mt-0.5 text-xs">{event.location}</p>
        )}
      </div>
      <ExternalLink className="text-muted-foreground mt-0.5 size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
    </a>
  );
}

// --- Props ---

type MomentFormRadarProps = {
  title: string;
  description: string;
  locationName: string;
  locationAddress: string;
  startsAt: string; // ISO or empty
};

export function MomentFormRadar({
  title,
  description,
  locationName,
  locationAddress,
  startsAt,
}: MomentFormRadarProps) {
  const t = useTranslations("Moment.radar");

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [editingKeywords, setEditingKeywords] = useState(false);
  const [city, setCity] = useState<string | null>(null);
  const [events, setEvents] = useState<EventResult[] | null>(null);
  const [targetDate, setTargetDate] = useState<string>("");
  const [noCity, setNoCity] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const canActivate =
    title.trim().length > 0 &&
    startsAt.length > 0 &&
    (locationName.trim().length > 0 || locationAddress.trim().length > 0);

  async function runRadar(kw?: string[]) {
    setLoading(true);
    setEvents(null);
    setNoCity(false);
    setError(null);
    if (!kw) {
      setKeywords([]);
      setCity(null);
    }

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/moments/radar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          locationName,
          locationAddress,
          startsAt,
          ...(kw ? { overrideKeywords: kw } : {}),
        }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        setError("Erreur serveur");
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const msg = JSON.parse(line.slice(6)) as RadarSSEEvent;
            if (msg.type === "keywords") {
              if (!kw) setKeywords(msg.keywords);
              setCity(msg.city);
            } else if (msg.type === "events") {
              setEvents(msg.events);
              setTargetDate(msg.targetDate);
            } else if (msg.type === "error_no_city") {
              setNoCity(true);
            } else if (msg.type === "error") {
              setError(msg.message);
            } else if (msg.type === "done") {
              setLoading(false);
            }
          } catch { /* ignore parse error */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message);
      }
      setLoading(false);
    }
  }

  function handleOpen() {
    setOpen(true);
    runRadar();
  }

  function handleClose() {
    abortRef.current?.abort();
    setOpen(false);
    setLoading(false);
    setEvents(null);
    setKeywords([]);
    setCity(null);
    setNoCity(false);
    setError(null);
    setEditingKeywords(false);
  }

  function removeKeyword(kw: string) {
    setKeywords((prev) => prev.filter((k) => k !== kw));
  }

  // Split events by day
  const dayEvents = events?.filter((e) => e.date === targetDate) ?? [];
  const weekEvents = events?.filter((e) => e.date !== targetDate) ?? [];

  return (
    <>
      {/* Trigger section in the form */}
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
          <Radar className="text-primary size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{t("title")}</p>
          <p className="text-muted-foreground text-xs">{t("hint")}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canActivate}
          onClick={handleOpen}
          className="shrink-0"
        >
          <Radar className="mr-1.5 size-3.5" />
          {t("analyzeButton")}
        </Button>
      </div>

      {/* Modal */}
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-lg">
          <DialogHeader className="border-border border-b px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Radar className="text-primary size-4" />
              {t("modalTitle")}
              {city && !loading && (
                <span className="text-muted-foreground text-sm font-normal">
                  — {t("cityLabel", { city })}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Loading */}
            {loading && (
              <div className="flex items-center gap-2 py-8 justify-center">
                <div className="border-primary size-5 animate-spin rounded-full border-2 border-t-transparent" />
                <span className="text-muted-foreground text-sm">{t("analyzing")}</span>
              </div>
            )}

            {/* Error: no city */}
            {!loading && noCity && (
              <div className="bg-destructive/10 text-destructive rounded-lg p-4 text-sm">
                {t("errorNoCity")}
              </div>
            )}

            {/* Error: generic */}
            {!loading && error && (
              <div className="bg-destructive/10 text-destructive rounded-lg p-4 text-sm">
                {error}
              </div>
            )}

            {/* Keywords */}
            {!loading && keywords.length > 0 && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                    {t("keywords")}
                  </p>
                  {!editingKeywords ? (
                    <button
                      type="button"
                      onClick={() => setEditingKeywords(true)}
                      className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
                    >
                      <Pencil className="size-3" />
                      {t("editKeywords")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingKeywords(false);
                        runRadar(keywords);
                      }}
                      className="text-primary hover:text-primary/80 flex items-center gap-1 text-xs font-medium transition-colors"
                    >
                      <Check className="size-3" />
                      {t("relaunch")}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {keywords.map((kw) => (
                    <Badge
                      key={kw}
                      variant="secondary"
                      className="gap-1 text-xs font-normal"
                    >
                      {kw}
                      {editingKeywords && (
                        <button
                          type="button"
                          onClick={() => removeKeyword(kw)}
                          className="hover:text-destructive ml-0.5 transition-colors"
                          aria-label={`Supprimer ${kw}`}
                        >
                          <X className="size-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Results */}
            {!loading && events !== null && !noCity && (
              <>
                {/* Ce jour-là */}
                <div>
                  <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
                    {t("conflictsSection")}
                  </p>
                  {dayEvents.length > 0 ? (
                    <div className="space-y-2">
                      {dayEvents.map((e, i) => (
                        <EventCard key={i} event={e} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">{t("noResults")}</p>
                  )}
                </div>

                {/* Cette semaine */}
                <div>
                  <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
                    {t("weekSection")}
                  </p>
                  {weekEvents.length > 0 ? (
                    <div className="space-y-2">
                      {weekEvents.map((e, i) => (
                        <EventCard key={i} event={e} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">{t("noResults")}</p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="border-border flex items-center justify-between border-t px-5 py-3">
            <p className="text-muted-foreground text-xs">{t("sources")}</p>
            <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
              {t("close")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
