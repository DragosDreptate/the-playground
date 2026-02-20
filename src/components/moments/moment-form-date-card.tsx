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
import { generateTimeOptions } from "@/lib/time-options";

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

  return (
    <div className="border-border bg-card rounded-lg border p-3">
      <div className="flex flex-col gap-2">
        {/* Start row */}
        <div className="flex items-center gap-2">
          <CalendarIcon className="text-muted-foreground size-4 shrink-0" />
          <span className="text-muted-foreground w-12 shrink-0 text-sm">
            {t("form.startLabel")}
          </span>
          <DatePickerButton
            date={startDate}
            label={formatDate(startDate)}
            locale={dateFnsLocale}
            onSelect={(d) => {
              onStartDateChange(d);
              // Auto-set end date if not yet set
              if (d && !endDate) onEndDateChange(d);
            }}
          />
          <TimeSelect
            value={startTime}
            onChange={onStartTimeChange}
            options={timeOptions}
          />
        </div>

        {/* Dotted connector */}
        <div className="ml-[7px] flex h-2 flex-col items-center">
          <div className="border-muted-foreground/30 h-full border-l border-dashed" />
        </div>

        {/* End row */}
        <div className="flex items-center gap-2">
          <CalendarIcon className="text-muted-foreground size-4 shrink-0" />
          <span className="text-muted-foreground w-12 shrink-0 text-sm">
            {t("form.endLabel")}
          </span>
          <DatePickerButton
            date={endDate}
            label={formatDate(endDate)}
            locale={dateFnsLocale}
            onSelect={onEndDateChange}
          />
          <TimeSelect
            value={endTime}
            onChange={onEndTimeChange}
            options={timeOptions}
          />
        </div>
      </div>

      {/* Timezone badge */}
      {timezone && (
        <div className="mt-2 flex justify-end">
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
  onSelect,
}: {
  date: Date | undefined;
  label: string;
  locale: Locale;
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
          onSelect={onSelect}
          locale={locale}
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
