"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { MapPin, Globe, Check, Clock, Crown } from "lucide-react";
import { getMomentGradient } from "@/lib/gradient";
import { formatWeekdayAndDate, formatTime } from "@/lib/format-date";
import { CircleAvatar } from "@/components/circles/circle-avatar";
import type { RegistrationWithMoment } from "@/domain/models/registration";

type DashboardMomentCardProps = {
  registration: RegistrationWithMoment;
  isLast: boolean;
  isHost?: boolean;
  isPast?: boolean;
};

export function DashboardMomentCard({ registration, isLast, isHost = false, isPast = false }: DashboardMomentCardProps) {
  const t = useTranslations("Dashboard");
  const tCircle = useTranslations("Circle");
  const locale = useLocale();
  const { moment } = registration;

  // Déféré au client pour éviter le mismatch structurel SSR/client (UTC vs timezone locale)
  const [isToday, setIsToday] = useState(false);
  useEffect(() => {
    const now = new Date();
    setIsToday(moment.startsAt.toDateString() === now.toDateString());
  }, [moment.startsAt]);

  const isRegistered = registration.status === "REGISTERED" || registration.status === "CHECKED_IN";
  const isWaitlisted = registration.status === "WAITLISTED";

  const dotClass = isPast
    ? "bg-border"
    : isRegistered
      ? "bg-primary"
      : isWaitlisted
        ? "bg-amber-400"
        : "bg-border";

  const gradient = getMomentGradient(moment.title);
  const { weekday, dateStr } = formatWeekdayAndDate(moment.startsAt, locale);
  const timeStr = formatTime(moment.startsAt);

  const locationLabel =
    moment.locationType === "ONLINE"
      ? t("online")
      : moment.locationType === "HYBRID"
        ? t("hybrid")
        : moment.locationName;

  const LocationIcon = moment.locationType === "IN_PERSON" ? MapPin : Globe;

  return (
    <div className="flex gap-0">
      {/* Date column */}
      <div className="w-[100px] shrink-0 pr-4 pt-1 text-right">
        {!isPast && isToday ? (
          <span className="inline-block rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
            {tCircle("detail.today")}
          </span>
        ) : (
          <>
            <p className={`text-xs ${isPast ? "text-muted-foreground/60" : "text-muted-foreground"}`} suppressHydrationWarning>{weekday}</p>
            <p className={`text-sm font-medium leading-snug ${isPast ? "text-muted-foreground" : ""}`} suppressHydrationWarning>{dateStr}</p>
          </>
        )}
      </div>

      {/* Dot + vertical line */}
      <div className="flex shrink-0 flex-col items-center">
        <div className={`mt-2 size-2 shrink-0 rounded-full ${dotClass}`} />
        {!isLast && (
          <div className="mt-2 flex-1 border-l border-dashed border-border" />
        )}
      </div>

      {/* Card */}
      <div className={`min-w-0 flex-1 pl-4 ${isLast ? "pb-0" : "pb-7"}`}>
        <Link href={`/dashboard/circles/${moment.circleSlug}/moments/${moment.slug}`} className="group block">
          <div className={`bg-card flex items-start gap-3 rounded-xl border p-3 transition-colors ${isPast ? "border-border" : "border-border hover:border-primary/30"}`}>

            {/* Cover — LEFT, 64×64px */}
            {moment.coverImage ? (
              <Image
                src={moment.coverImage}
                alt={moment.title}
                width={64}
                height={64}
                className={`size-16 shrink-0 rounded-xl object-cover ${isPast ? "opacity-40 grayscale" : ""}`}
              />
            ) : (
              <div
                className={`size-16 shrink-0 rounded-xl ${isPast ? "opacity-40 grayscale" : ""}`}
                style={{ background: gradient }}
              />
            )}

            {/* Content — RIGHT */}
            <div className="min-w-0 flex-1 space-y-1">
              {/* Time */}
              <p className={`text-xs ${isPast ? "text-muted-foreground/60" : "text-muted-foreground"}`} suppressHydrationWarning>{timeStr}</p>

              {/* Title — 2 lignes max */}
              <p className={`line-clamp-2 font-semibold leading-snug ${isPast ? "text-muted-foreground" : "group-hover:underline"}`}>
                {moment.title}
              </p>

              {/* Location */}
              {locationLabel && (
                <div className={`flex items-center gap-1.5 text-xs ${isPast ? "text-muted-foreground/60" : "text-muted-foreground"}`}>
                  <LocationIcon className="size-3 shrink-0" />
                  <span className="truncate">{locationLabel}</span>
                </div>
              )}

              {/* Community + badge */}
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <span className={`flex min-w-0 shrink items-center gap-1.5 text-xs ${isPast ? "text-muted-foreground/60" : "text-muted-foreground"}`}>
                  <CircleAvatar name={moment.circleName} image={moment.circleCoverImage} size="xs" />
                  <span className="truncate">{moment.circleName}</span>
                </span>

                {!isPast && (
                  isHost ? (
                    <Badge variant="outline" className="shrink-0 gap-1 border-primary/40 text-xs text-primary">
                      <Crown className="size-3" />
                      {t("role.host")}
                    </Badge>
                  ) : isRegistered ? (
                    <Badge variant="outline" className="shrink-0 gap-1 border-primary/40 text-xs text-primary">
                      <Check className="size-3" />
                      {t("registrationStatus.registered")}
                    </Badge>
                  ) : isWaitlisted ? (
                    <Badge variant="secondary" className="shrink-0 gap-1 text-xs">
                      <Clock className="size-3" />
                      {t("registrationStatus.waitlisted")}
                    </Badge>
                  ) : null
                )}
              </div>
            </div>

          </div>
        </Link>
      </div>
    </div>
  );
}
