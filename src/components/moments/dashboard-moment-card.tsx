"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { MapPin, Globe, Check, Clock, Crown } from "lucide-react";
import { getMomentGradient } from "@/lib/gradient";
import { CircleAvatar } from "@/components/circles/circle-avatar";
import type { RegistrationWithMoment } from "@/domain/models/registration";

type DashboardMomentCardProps = {
  registration: RegistrationWithMoment;
  isLast: boolean;
  isHost?: boolean;
  isPast?: boolean;
};

function formatTimelineDate(date: Date): { weekday: string; dateStr: string; isToday: boolean } {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const weekday = date.toLocaleDateString(undefined, { weekday: "short" });
  const dateStr = date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

  return { weekday, dateStr, isToday };
}

export function DashboardMomentCard({ registration, isLast, isHost = false, isPast = false }: DashboardMomentCardProps) {
  const t = useTranslations("Dashboard");
  const tCircle = useTranslations("Circle");
  const { moment } = registration;

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
  const { weekday, dateStr, isToday } = formatTimelineDate(moment.startsAt);

  const timeStr = moment.startsAt.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

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
            <p className={`text-xs ${isPast ? "text-muted-foreground/60" : "text-muted-foreground"}`}>{weekday}</p>
            <p className={`text-sm font-medium leading-snug ${isPast ? "text-muted-foreground" : ""}`}>{dateStr}</p>
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
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={moment.coverImage}
                alt={moment.title}
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
              <p className={`text-xs ${isPast ? "text-muted-foreground/60" : "text-muted-foreground"}`}>{timeStr}</p>

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
