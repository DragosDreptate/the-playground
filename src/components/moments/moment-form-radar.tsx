"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { Radar, Search, X, ExternalLink, Clock, MapPin, Calendar, Pencil } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EventResult } from "@/lib/events-radar";
import posthog from "posthog-js";

// --- Types SSE ---

type RadarSSEEvent =
  | { type: "keywords"; keywords: string[]; city: string | null }
  | { type: "events"; events: EventResult[]; dateFrom: string; dateTo: string; targetDate: string }
  | { type: "error_no_city" }
  | { type: "error_rate_limit"; limit: number }
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

function formatShortDate(isoString: string, locale: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString(locale, { day: "numeric", month: "long" });
  } catch {
    return isoString.slice(0, 10);
  }
}

function formatWeekPillDate(from: string, to: string, locale: string): string {
  try {
    const df = new Date(from + "T12:00:00Z");
    const dt = new Date(to + "T12:00:00Z");
    const month = dt.toLocaleDateString(locale, { month: "long" });
    const year = dt.getUTCFullYear();
    return `${df.getUTCDate()}–${dt.getUTCDate()} ${month} ${year}`;
  } catch {
    return "";
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

const SOURCE_ICONS: Record<string, string> = {
  luma: "/favicons/luma.png",
  eventbrite: "/favicons/eventbrite.png",
  meetup: "/favicons/meetup.png",
};

function SourceBadge({ source }: { source: string }) {
  const icon = SOURCE_ICONS[source];
  if (!icon) {
    return (
      <span className="border-border bg-muted text-muted-foreground inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase">
        {source}
      </span>
    );
  }
  return (
    <img
      src={icon}
      alt={source}
      width={22}
      height={22}
      className="shrink-0 rounded-md"
    />
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
      className="bg-muted hover:bg-card border-border flex items-center gap-3 rounded-lg border p-3 transition-colors"
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
      <ExternalLink className="text-muted-foreground size-3.5 shrink-0 opacity-60" />
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
      <div
        className={`w-0.5 min-h-[18px] shrink-0 self-stretch rounded-full ${
          dotColor === "red" ? "bg-red-400" : "bg-orange-400"
        }`}
      />
      <span className="text-xs font-bold uppercase tracking-wide flex-1">{label}</span>
      {count > 0 && (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            dotColor === "red"
              ? "bg-red-500/10 text-red-400"
              : "bg-orange-500/10 text-orange-400"
          }`}
        >
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

  const [lastCity, setLastCity] = useState<string | null>(null);
  const [lastKeywords, setLastKeywords] = useState<string[]>([]);

  const abortRef = useRef<AbortController | null>(null);

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

    let localEvents: EventResult[] = [];
    let localCity: string | null = null;
    let localTargetDate: string | null = null;

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
              localCity = msg.city;
              if (!kw) setKeywords(msg.keywords);
              setCity(msg.city);
              if (msg.city) setLastCity(msg.city);
              if (!kw && msg.keywords.length > 0) setLastKeywords(msg.keywords);
            } else if (msg.type === "events") {
              localEvents = msg.events;
              localTargetDate = msg.targetDate;
              setEvents(msg.events);
              setTargetDate(msg.targetDate);
            } else if (msg.type === "error_no_city") {
              setNoCity(true);
            } else if (msg.type === "error_rate_limit") {
              setError(t("rateLimitReached", { limit: msg.limit }));
            } else if (msg.type === "error") {
              setError(msg.message);
            } else if (msg.type === "done") {
              setLoading(false);
              posthog.capture("radar_searched", {
                city: localCity,
                events_found: localEvents.length,
                target_date: localTargetDate,
                day_events_count: localTargetDate
                  ? localEvents.filter((e) => e.date === localTargetDate).length
                  : 0,
              });
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
    setNewKeyword("");
  }

  const [newKeyword, setNewKeyword] = useState("");
  const keywordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingKeywords) {
      keywordInputRef.current?.focus();
    }
  }, [editingKeywords]);

  function removeKeyword(kw: string) {
    setKeywords((prev) => prev.filter((k) => k !== kw));
  }

  function addKeyword(raw: string) {
    const kw = raw.trim().slice(0, 50);
    if (!kw) return;
    setKeywords((prev) => (prev.includes(kw) ? prev : [...prev, kw]));
    setNewKeyword("");
  }

  function handleKeywordInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addKeyword(newKeyword);
    }
  }

  const dayEvents = events?.filter((e) => e.date === targetDate) ?? [];
  const weekEvents = events?.filter((e) => e.date !== targetDate) ?? [];

  return (
    <>
      {/* Trigger section */}
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
          <Radar className="text-primary size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {t("title")}
          </p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {lastCity || startsAt ? (
              <>
                {t("hint")}
                {lastCity && (
                  <>{t("cityConnector")}<strong className="text-foreground">{lastCity}</strong></>
                )}
                {startsAt && (
                  <>{t("dateConnector")}<strong className="text-foreground">{formatShortDate(startsAt, locale)}</strong></>
                )}
                {lastKeywords.length > 0 && (
                  <> — {lastKeywords.join(", ")}</>
                )}
              </>
            ) : (
              t("hint")
            )}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={!canActivate}
          onClick={handleOpen}
          className="shrink-0"
        >
          <Search className="mr-1.5 size-3.5" />
          {t("analyzeShort")}
        </Button>
      </div>

      {/* Modal */}
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-lg">

          {/* Header — gradient subtil + pills ville/date */}
          <DialogHeader className="border-border border-b bg-gradient-to-br from-primary/5 to-transparent px-5 pt-5 pb-4">
            <DialogTitle className="flex items-center gap-2.5 text-base font-bold">
              <div className="bg-primary/10 border-primary/20 flex size-[34px] shrink-0 items-center justify-center rounded-[9px] border">
                <Radar className="text-primary size-[18px]" />
              </div>
              {t("modalTitle")}
            </DialogTitle>
            {weekFrom && weekTo && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {city && (
                  <span className="bg-muted border-border text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium">
                    <MapPin className="size-3 opacity-70" />
                    {city}
                  </span>
                )}
                <span className="bg-muted border-border text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium">
                  <Calendar className="size-3 opacity-70" />
                  {formatWeekPillDate(weekFrom, weekTo, locale)}
                </span>
              </div>
            )}
          </DialogHeader>

          {/* Keywords — label uppercase + icône Pencil sur Modifier */}
          {!loading && (keywords.length > 0 || editingKeywords) && (
            <div className="border-border border-b px-5 py-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-muted-foreground mr-0.5 shrink-0 text-[11px] font-semibold uppercase tracking-wider">
                  {t("keywords")}
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
                        className="hover:text-foreground transition-colors"
                        aria-label={`Supprimer ${kw}`}
                      >
                        <X className="size-3" />
                      </button>
                    )}
                  </span>
                ))}
                {editingKeywords && (
                  <input
                    ref={keywordInputRef}
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={handleKeywordInputKeyDown}
                    onBlur={() => addKeyword(newKeyword)}
                    placeholder={t("addKeyword")}
                    maxLength={50}
                    className="border-border bg-transparent text-foreground placeholder:text-muted-foreground inline-flex h-[26px] w-28 rounded-full border border-dashed px-2.5 text-xs outline-none focus:border-primary"
                  />
                )}
                {!editingKeywords ? (
                  <button
                    type="button"
                    onClick={() => setEditingKeywords(true)}
                    className="border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs transition-colors"
                  >
                    <Pencil className="size-3" />
                    {t("editKeywords")}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const pending = newKeyword.trim().slice(0, 50);
                      const finalKw = pending && !keywords.includes(pending)
                        ? [...keywords, pending]
                        : keywords;
                      setKeywords(finalKw);
                      setNewKeyword("");
                      setEditingKeywords(false);
                      runRadar(finalKw);
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
                    countLabel={t("eventCount", { count: dayEvents.length })}
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
                    countLabel={t("otherCount", { count: weekEvents.length })}
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

          {/* Footer — compteur à gauche + Fermer à droite */}
          <div className="border-border flex items-center justify-between border-t px-5 py-3">
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
              {events !== null && !noCity && !loading && (
                <>
                  <Search className="size-3.5" />
                  {t.rich("totalFound", {
                    count: events.length,
                    bold: (chunks) => <strong className="text-foreground font-semibold">{chunks}</strong>,
                  })}
                </>
              )}
            </span>
            <Button type="button" variant="outline" size="sm" onClick={handleClose}>
              {t("close")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
