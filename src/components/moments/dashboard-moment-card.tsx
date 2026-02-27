"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { MapPin, Globe, Check, Clock, Crown, Users } from "lucide-react";
import { getMomentGradient } from "@/lib/gradient";
import { formatWeekdayAndDate, formatTime } from "@/lib/format-date";
import { CircleAvatar } from "@/components/circles/circle-avatar";
import type { RegistrationWithMoment } from "@/domain/models/registration";
import type { HostMomentSummary } from "@/domain/models/moment";

type ParticipantProps = {
  variant: "participant";
  registration: RegistrationWithMoment;
  isLast: boolean;
  isHost?: boolean;
  isPast?: boolean;
};

type OrganizerProps = {
  variant: "organizer";
  moment: HostMomentSummary;
  isLast: boolean;
  isPast?: boolean;
};

type DashboardMomentCardProps = ParticipantProps | OrganizerProps;

export function DashboardMomentCard(props: DashboardMomentCardProps) {
  const t = useTranslations("Dashboard");
  const tCircle = useTranslations("Circle");
  const locale = useLocale();

  const isOrganizer = props.variant === "organizer";
  const isPast = props.isPast ?? false;
  const isLast = props.isLast;

  // Extraire les données selon le variant
  const momentData = isOrganizer
    ? {
        slug: props.moment.slug,
        title: props.moment.title,
        coverImage: props.moment.coverImage,
        startsAt: props.moment.startsAt,
        locationType: props.moment.locationType,
        locationName: props.moment.locationName,
        circleSlug: props.moment.circle.slug,
        circleName: props.moment.circle.name,
        circleCoverImage: props.moment.circle.coverImage,
      }
    : {
        slug: props.registration.moment.slug,
        title: props.registration.moment.title,
        coverImage: props.registration.moment.coverImage,
        startsAt: props.registration.moment.startsAt,
        locationType: props.registration.moment.locationType,
        locationName: props.registration.moment.locationName,
        circleSlug: props.registration.moment.circleSlug,
        circleName: props.registration.moment.circleName,
        circleCoverImage: props.registration.moment.circleCoverImage,
      };

  const [isToday, setIsToday] = useState(false);
  useEffect(() => {
    const now = new Date();
    setIsToday(momentData.startsAt.toDateString() === now.toDateString());
  }, [momentData.startsAt]);

  const isRegistered =
    !isOrganizer &&
    (props.registration.status === "REGISTERED" ||
      props.registration.status === "CHECKED_IN");
  const isWaitlisted = !isOrganizer && props.registration.status === "WAITLISTED";

  const dotClass = isPast
    ? "bg-border"
    : isOrganizer
      ? "bg-primary"
      : isRegistered
        ? "bg-primary"
        : isWaitlisted
          ? "bg-amber-400"
          : "bg-border";

  const gradient = getMomentGradient(momentData.title);
  const { weekday, dateStr } = formatWeekdayAndDate(momentData.startsAt, locale);
  const timeStr = formatTime(momentData.startsAt);

  const locationLabel =
    momentData.locationType === "ONLINE"
      ? t("online")
      : momentData.locationType === "HYBRID"
        ? t("hybrid")
        : momentData.locationName;

  const LocationIcon = momentData.locationType === "IN_PERSON" ? MapPin : Globe;

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
            <p
              className={`text-xs ${isPast ? "text-muted-foreground/60" : "text-muted-foreground"}`}
              suppressHydrationWarning
            >
              {weekday}
            </p>
            <p
              className={`text-sm font-medium leading-snug ${isPast ? "text-muted-foreground" : ""}`}
              suppressHydrationWarning
            >
              {dateStr}
            </p>
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
        <Link
          href={`/dashboard/circles/${momentData.circleSlug}/moments/${momentData.slug}`}
          className="group block"
        >
          <div
            className={`bg-card flex items-start gap-3 rounded-xl border p-3 transition-colors ${
              isPast ? "border-border" : "border-border hover:border-primary/30"
            }`}
          >
            {/* Cover — LEFT, 64×64px */}
            {momentData.coverImage ? (
              <Image
                src={momentData.coverImage}
                alt={momentData.title}
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
              <p
                className={`text-xs ${isPast ? "text-muted-foreground/60" : "text-muted-foreground"}`}
                suppressHydrationWarning
              >
                {timeStr}
              </p>

              {/* Title */}
              <p
                className={`line-clamp-2 font-semibold leading-snug ${
                  isPast ? "text-muted-foreground" : "group-hover:underline"
                }`}
              >
                {momentData.title}
              </p>

              {/* Location */}
              {locationLabel && (
                <div
                  className={`flex items-center gap-1.5 text-xs ${
                    isPast ? "text-muted-foreground/60" : "text-muted-foreground"
                  }`}
                >
                  <LocationIcon className="size-3 shrink-0" />
                  <span className="truncate">{locationLabel}</span>
                </div>
              )}

              {/* Community + badge */}
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <span
                  className={`flex min-w-0 shrink items-center gap-1.5 text-xs ${
                    isPast ? "text-muted-foreground/60" : "text-muted-foreground"
                  }`}
                >
                  <CircleAvatar
                    name={momentData.circleName}
                    image={momentData.circleCoverImage}
                    size="xs"
                  />
                  <span className="truncate">{momentData.circleName}</span>
                </span>

                {!isPast && (
                  isOrganizer ? (
                    <Badge
                      variant="outline"
                      className="shrink-0 gap-1 border-primary/40 text-xs text-primary"
                    >
                      <Crown className="size-3" />
                      {t("role.host")}
                      {(props as OrganizerProps).moment.registrationCount > 0 && (
                        <span className="flex items-center gap-0.5">
                          {" · "}
                          <Users className="size-2.5" />
                          {(props as OrganizerProps).moment.registrationCount}
                        </span>
                      )}
                    </Badge>
                  ) : isRegistered ? (
                    <Badge
                      variant="outline"
                      className="shrink-0 gap-1 border-primary/40 text-xs text-primary"
                    >
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
