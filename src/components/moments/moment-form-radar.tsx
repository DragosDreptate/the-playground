"use client";

import { useState, useRef, useMemo } from "react";
import { Radar, X, ExternalLink, Clock, MapPin, Calendar } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
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

// --- Date helpers ---

function getWeekBounds(dateStr: string): { weekFrom: string; weekTo: string } {
  const d = new Date(dateStr + "T12:00:00Z");
  const day = d.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return {
    weekFrom: monday.toISOString().slice(0, 10),
    weekTo: sunday.toISOString().slice(0, 10),
  };
}

function formatWeekSubtitle(city: string, from: string, to: string, locale: string): string {
  try {
    const df = new Date(from + "T12:00:00Z");
    const dt = new Date(to + "T12:00:00Z");
    const month = dt.toLocaleDateString(locale, { month: "long" });
    const year = dt.getUTCFullYear();
    return `${city} · ${df.getUTCDate()}–${dt.getUTCDate()} ${month} ${year}`;
  } catch {
    return city;
  }
}

function formatDayFull(dateStr: string, locale: string): string {
  try {
    const d = new Date(dateStr + "T12:00:00Z");
    return d.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" }).toUpperCase();
  } catch {
    return dateStr;
  }
}

function formatWeekRange(from: string, to: string, locale: string): string {
  try {
    const df = new Date(from + "T12:00:00Z");
    const dt = new Date(to + "T12:00:00Z");
    const month = dt.toLocaleDateString(locale, { month: "long" }).toUpperCase();
    return `${df.getUTCDate()}–${dt.getUTCDate()} ${month}`;
  } catch {
    return "";
  }
}

function formatShortDay(dateStr: string, locale: string): string {
  try {
    const d = new Date(dateStr + "T12:00:00Z");
    const weekday = d.toLocaleDateString(locale, { weekday: "short" }).replace(/\.$/, "");
    return `${weekday}. ${d.getUTCDate()}`;
  } catch {
    return dateStr;
  }
}

// --- Source badge ---

const SOURCE_STYLES: Record<string, string> = {
  luma: "border-violet-300 bg-violet-50 text-violet-700",
  eventbrite: "border-orange-300 bg-orange-50 text-orange-700",
  meetup: "border-red-300 bg-red-50 text-red-700",
  mobilizon: "border-emerald-300 bg-emerald-50 text-emerald-700",
};

function SourceBadge({ source }: { source: string }) {
  const cls = SOURCE_STYLES[source] ?? "border-border bg-muted text-muted-foreground";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cls}`}
    >
      {source}
    </span>
  );
}

// --- Event card ---

function EventCard({
  event,
  showDay,
  locale,
}: {
  event: EventResult;
  showDay: boolean;
  locale: string;
}) {
  return (
    <a
      href={event.url}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:bg-muted/40 flex items-center gap-3 rounded-lg border p-3 transition-colors"
    >
      <SourceBadge source={event.source} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug">{event.title}</p>
        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
          {showDay && event.date && (
            <span className="flex items-center gap-1">
              <Calendar className="size-3 shrink-0" />
              {formatShortDay(event.date, locale)}
            </span>
          )}
          {event.time && (
            <span className="flex items-center gap-1">
              <Clock className="size-3 shrink-0" />
              {event.time}
            </span>
          )}
          {event.location && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{event.location}</span>
            </span>
          )}
        </div>
      </div>
      <ExternalLink className="text-muted-foreground size-3.5 shrink-0" />
    </a>
  );
}

// --- Section header ---

function SectionHeader({
  label,
  count,
  countLabel,
  dotColor,
}: {
  label: string;
  count: number;
  countLabel: string;
  dotColor: "red" | "orange";
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`size-2 shrink-0 rounded-full ${dotColor === "red" ? "bg-red-500" : "bg-orange-400"}`}
      />
      <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
      {count > 0 && (
        <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
          {countLabel}
        </span>
      )}
    </div>
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
  const locale = useLocale();

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

  // Week bounds computed from startsAt (known upfront, not from SSE)
  const { weekFrom, weekTo } = useMemo(
    () => (startsAt ? getWeekBounds(startsAt.slice(0, 10)) : { weekFrom: "", weekTo: "" }),
    [startsAt]
  );

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

  const dayEvents = events?.filter((e) => e.date === targetDate) ?? [];
  const weekEvents = events?.filter((e) => e.date !== targetDate) ?? [];

  // Subtitle: "Paris · 10–16 mars 2026" (computed as soon as city is known)
  const subtitle = city
    ? formatWeekSubtitle(city, weekFrom, weekTo, locale)
    : null;

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

          {/* Header */}
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Radar className="text-primary size-4 shrink-0" />
              {t("modalTitle")}
            </DialogTitle>
            {subtitle && (
              <p className="text-muted-foreground text-sm">{subtitle}</p>
            )}
          </DialogHeader>

          {/* Keywords — inline, séparés du header par un border-b */}
          {!loading && keywords.length > 0 && (
            <div className="border-border border-b px-5 pb-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-muted-foreground shrink-0 text-xs font-medium">
                  {t("keywords")} :
                </span>
                {keywords.map((kw) => (
                  <span
                    key={kw}
                    className="border-primary/40 bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium"
                  >
                    {kw}
                    {editingKeywords && (
                      <button
                        type="button"
                        onClick={() => removeKeyword(kw)}
                        className="hover:text-primary/60 transition-colors"
                        aria-label={`Supprimer ${kw}`}
                      >
                        <X className="size-3" />
                      </button>
                    )}
                  </span>
                ))}
                {!editingKeywords ? (
                  <button
                    type="button"
                    onClick={() => setEditingKeywords(true)}
                    className="border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs transition-colors"
                  >
                    {t("editKeywords")}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingKeywords(false);
                      runRadar(keywords);
                    }}
                    className="bg-primary text-primary-foreground inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-opacity hover:opacity-90"
                  >
                    {t("relaunch")}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Scrollable body */}
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center gap-2 py-10">
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

            {/* Results */}
            {!loading && events !== null && !noCity && (
              <>
                {/* Ce jour-là */}
                <div className="space-y-2">
                  <SectionHeader
                    label={`${t("conflictsSection")} — ${formatDayFull(targetDate, locale)}`}
                    count={dayEvents.length}
                    countLabel={`${dayEvents.length} événement${dayEvents.length > 1 ? "s" : ""}`}
                    dotColor="red"
                  />
                  {dayEvents.length > 0 ? (
                    <div className="space-y-2">
                      {dayEvents.map((e, i) => (
                        <EventCard key={i} event={e} showDay={false} locale={locale} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground pl-4 text-sm">{t("noResults")}</p>
                  )}
                </div>

                {/* Cette semaine */}
                <div className="space-y-2">
                  <SectionHeader
                    label={`${t("weekSection")} — ${formatWeekRange(weekFrom, weekTo, locale)}`}
                    count={weekEvents.length}
                    countLabel={`${weekEvents.length} autre${weekEvents.length > 1 ? "s" : ""}`}
                    dotColor="orange"
                  />
                  {weekEvents.length > 0 ? (
                    <div className="space-y-2">
                      {weekEvents.map((e, i) => (
                        <EventCard key={i} event={e} showDay={true} locale={locale} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground pl-4 text-sm">{t("noResults")}</p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="border-border flex items-center justify-between border-t px-5 py-3">
            <p className="text-muted-foreground text-xs">{t("sources")}</p>
            <Button type="button" variant="outline" size="sm" onClick={handleClose}>
              {t("close")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
