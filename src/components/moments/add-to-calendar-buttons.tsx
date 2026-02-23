"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { CalendarEventData } from "@/lib/calendar";
import { buildGoogleCalendarUrl } from "@/lib/calendar";

function GoogleCalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M24 20.5v7h7.4c-.6 3.4-3.6 5.9-7.4 5.9-4.4 0-8-3.6-8-8s3.6-8 8-8c2 0 3.8.7 5.2 1.9l5.2-5.2C31.3 11.9 27.8 10 24 10c-7.7 0-14 6.3-14 14s6.3 14 14 14c8 0 13.3-5.6 13.3-13.5 0-.9-.1-1.7-.2-2.5H24z" />
      <path fill="#34A853" d="M10.5 28.5l-3.4 2.5C9 34 13.2 36.5 18 37.5V33c-3-.7-5.6-2.4-7.5-4.5z" />
      <path fill="#FBBC05" d="M38 29.5c-1 2.7-2.8 5-5.2 6.6l3.4 2.5c2.5-2.2 4.4-5.1 5.3-8.4L38 29.5z" />
      <path fill="#EA4335" d="M18 15v-4.5C13.2 11.5 9 14 7.1 17.5L10.5 20C12.4 17.4 15 15.7 18 15z" />
    </svg>
  );
}

type Props = {
  data: CalendarEventData;
  appUrl: string;
};

export function AddToCalendarButtons({ data, appUrl }: Props) {
  const t = useTranslations("Moment.public");

  const googleUrl = buildGoogleCalendarUrl(data, appUrl);
  const icsUrl = `/api/moments/${data.slug}/calendar`;

  return (
    <div className="space-y-2">
      <div className="border-border border-t" />
      <p className="text-muted-foreground text-xs">
        {t("addToCalendar.label")}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" asChild>
          <a href={googleUrl} target="_blank" rel="noopener noreferrer">
            <GoogleCalendarIcon />
            {t("addToCalendar.google")}
          </a>
        </Button>
        <Button variant="outline" size="sm" className="flex-1" asChild>
          <a href={icsUrl} download={`${data.slug}.ics`}>
            <Download className="size-3.5" />
            {t("addToCalendar.ics")}
          </a>
        </Button>
      </div>
    </div>
  );
}
