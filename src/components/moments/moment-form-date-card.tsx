"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarIcon } from "lucide-react";
import { format, type Locale } from "date-fns";
import { fr } from "date-fns/locale/fr";
import { enUS } from "date-fns/locale/en-US";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateTimeOptions, combineDateAndTime } from "@/lib/time-options";

type MomentFormDateCardProps = {
  startDate: Date | undefined;
  startTime: string;
  endDate: Date | undefined;
  endTime: string;
  onStartDateChange: (date: Date | undefined) => void;
  onStartTimeChange: (time: string) => void;
  onEndDateChange: (date: Date | undefined) => void;
  onEndTimeChange: (time: string) => void;
};

export function MomentFormDateCard({
  startDate,
  startTime,
  endDate,
  endTime,
  onStartDateChange,
  onStartTimeChange,
  onEndDateChange,
  onEndTimeChange,
}: MomentFormDateCardProps) {
  const t = useTranslations("Moment");
  const locale = useLocale();
  const dateFnsLocale = locale === "fr" ? fr : enUS;
  const timeOptions = useMemo(() => generateTimeOptions(), []);
  const [timezone, setTimezone] = useState("");

  const isEndBeforeStart = useMemo(() => {
    if (!startDate || !endDate) return false;
    const start = combineDateAndTime(startDate, startTime);
    const end = combineDateAndTime(endDate, endTime);
    if (!start || !end) return false;
    return end <= start;
  }, [startDate, startTime, endDate, endTime]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const isStartToday =
    startDate?.toDateString() === new Date().toDateString();

  const filteredStartTimeOptions = useMemo(() => {
    if (!isStartToday) return timeOptions;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return timeOptions.filter(({ value }) => {
      const [h, m] = value.split(":").map(Number);
      return h * 60 + m > nowMinutes;
    });
  }, [isStartToday, timeOptions]);

  useEffect(() => {
    if (!isStartToday || filteredStartTimeOptions.length === 0) return;
    const isValid = filteredStartTimeOptions.some(
      (opt) => opt.value === startTime
    );
    if (!isValid) {
      onStartTimeChange(filteredStartTimeOptions[0].value);
    }
  }, [isStartToday, startTime, filteredStartTimeOptions, onStartTimeChange]);

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offset = new Date().toLocaleString("en", {
      timeZoneName: "shortOffset",
    });
    const gmtPart = offset.split(" ").pop() ?? "";
    setTimezone(`${gmtPart} ${tz.split("/").pop()?.replace(/_/g, " ") ?? ""}`);
  }, []);

  function formatDate(date: Date | undefined): string {
    if (!date) return t("form.pickDate");
    return format(date, "EEE d MMM", { locale: dateFnsLocale });
  }

  // --- Auto-adjustment helpers ---

  /** Adds 1 hour to a "HH:mm" slot. Returns the new time and whether midnight was crossed. */
  function addOneHour(time: string): { time: string; overflow: boolean } {
    const [h, m] = time.split(":").map(Number);
    const totalMin = h * 60 + m + 60;
    const newH = Math.floor(totalMin / 60) % 24;
    const newM = totalMin % 60;
    return {
      time: `${newH.toString().padStart(2, "0")}:${newM.toString().padStart(2, "0")}`,
      overflow: totalMin >= 24 * 60,
    };
  }

  /** Compares two dates by day only (ignores time). */
  function dayOf(d: Date): number {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }

  /** If the new start would push past end, adjusts endTime (+1h) and endDate (if overflow). */
  function adjustEndIfNeeded(newStartDate: Date, newStartTime: string) {
    if (!endDate) return;
    const startISO = combineDateAndTime(newStartDate, newStartTime);
    const endISO = combineDateAndTime(endDate, endTime);
    if (!startISO || !endISO || endISO > startISO) return;

    const { time: newEndTime, overflow } = addOneHour(newStartTime);
    onEndTimeChange(newEndTime);
    if (overflow) {
      const nextDay = new Date(newStartDate);
      nextDay.setDate(nextDay.getDate() + 1);
      onEndDateChange(nextDay);
    }
  }

  // --- Handlers ---

  /** Cas A: start date changes → endDate follows; adjust endTime if needed. */
  function handleStartDateChange(d: Date | undefined) {
    onStartDateChange(d);
    if (!d) return;
    onEndDateChange(d);
    adjustEndIfNeeded(d, startTime);
  }

  /** Cas B: start time changes → adjust endTime if now past end. */
  function handleStartTimeChange(newTime: string) {
    onStartTimeChange(newTime);
    if (!startDate) return;
    adjustEndIfNeeded(startDate, newTime);
  }

  /** Cas C: end date changes → block dates before startDate. */
  function handleEndDateChange(d: Date | undefined) {
    if (!d || !startDate) { onEndDateChange(d); return; }
    if (dayOf(d) < dayOf(startDate)) {
      // Snap back to startDate and adjust time if needed
      onEndDateChange(startDate);
      adjustEndIfNeeded(startDate, startTime);
    } else {
      onEndDateChange(d);
    }
  }

  return (
    <div className="space-y-2">
      {/* Start row */}
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
          <CalendarIcon className="text-primary size-4" />
        </div>
        <span className="text-muted-foreground w-12 shrink-0 text-sm">
          {t("form.startLabel")}
        </span>
        <DatePickerButton
          date={startDate}
          label={formatDate(startDate)}
          locale={dateFnsLocale}
          disabledBefore={today}
          onSelect={handleStartDateChange}
        />
        <TimeSelect
          value={startTime}
          onChange={handleStartTimeChange}
          options={filteredStartTimeOptions}
        />
      </div>

      {/* End row */}
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
          <CalendarIcon className="text-primary size-4" />
        </div>
        <span className="text-muted-foreground w-12 shrink-0 text-sm">
          {t("form.endLabel")}
        </span>
        <DatePickerButton
          date={endDate}
          label={formatDate(endDate)}
          locale={dateFnsLocale}
          disabledBefore={startDate}
          onSelect={handleEndDateChange}
        />
        <TimeSelect
          value={endTime}
          onChange={onEndTimeChange}
          options={timeOptions}
        />
      </div>

      {/* End before start warning */}
      {isEndBeforeStart && (
        <p className="text-destructive pl-12 text-xs">
          {t("form.endBeforeStart")}
        </p>
      )}

      {/* Timezone badge */}
      {timezone && (
        <div className="pl-12">
          <Badge variant="secondary" className="text-xs font-normal">
            {timezone}
          </Badge>
        </div>
      )}
    </div>
  );
}

function DatePickerButton({
  date,
  label,
  locale,
  disabledBefore,
  onSelect,
}: {
  date: Date | undefined;
  label: string;
  locale: Locale;
  disabledBefore?: Date;
  onSelect: (date: Date | undefined) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 px-2 text-sm font-medium"
        >
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          defaultMonth={date ?? new Date()}
          onSelect={onSelect}
          locale={locale}
          disabled={disabledBefore ? { before: disabledBefore } : undefined}
        />
      </PopoverContent>
    </Popover>
  );
}

function TimeSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-[100px] text-sm" size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" className="max-h-60">
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
