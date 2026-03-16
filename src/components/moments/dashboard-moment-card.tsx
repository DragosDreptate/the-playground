"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { DraftBadge } from "@/components/badges/draft-badge";
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
  const tMoment = useTranslations("Moment");
  const locale = useLocale();

  const isOrganizer = props.variant === "organizer";
  const isPast = props.isPast ?? false;
  const isLast = props.isLast;
  const isDraft = isOrganizer && (props as OrganizerProps).moment.status === "DRAFT";

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
        registrationCount: props.moment.registrationCount,
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
        registrationCount: props.registration.moment.registrationCount,
      };

  const [isToday, setIsToday] = useState(false);
  useEffect(() => {
    const now = new Date();
    setIsToday(momentData.startsAt.toDateString() === now.toDateString());
  }, [momentData.startsAt]);

  const isHost = !isOrganizer && (props as ParticipantProps).isHost === true;
  const isRegistered =
    !isOrganizer &&
    !isHost &&
    (props.registration.status === "REGISTERED" ||
      props.registration.status === "CHECKED_IN");
  const isWaitlisted = !isOrganizer && !isHost && props.registration.status === "WAITLISTED";

  const dotClass = isPast
    ? "bg-border"
    : isDraft
      ? "bg-muted-foreground/40"
      : isOrganizer || isHost
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
      <div className="w-[72px] shrink-0 pr-2 pt-1 text-right sm:w-[100px] sm:pr-4">
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
      <div className={`min-w-0 flex-1 pl-2 sm:pl-4 ${isLast ? "pb-0" : "pb-7"}`}>
        <Link
          href={`/dashboard/circles/${momentData.circleSlug}/moments/${momentData.slug}`}
          className="group block"
        >
          <div
            className={`bg-card flex items-start gap-3 rounded-xl border p-3 transition-colors ${
              isPast ? "border-border" : "border-border hover:border-primary/30"
            }`}
          >
            {/* Content — LEFT */}
            <div className="min-w-0 flex-1 space-y-1">
              {/* Time + badge */}
              <div className="flex items-center gap-2">
                <p
                  className={`shrink-0 text-xs ${isPast ? "text-muted-foreground/60" : "text-muted-foreground"}`}
                  suppressHydrationWarning
                >
                  {timeStr}
                </p>
                {!isPast && (
                  isDraft ? (
                    <DraftBadge label={tMoment("status.draft")} />
                  ) : isOrganizer ? (
                    <Badge variant="outline" className="shrink-0 gap-1 border-primary/40 text-xs text-primary">
                      <Crown className="size-3" />
                      {t("role.host")}
                    </Badge>
                  ) : isHost ? (
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

              {/* Title */}
              <p
                className={`truncate font-semibold leading-snug ${
                  isPast ? "text-muted-foreground" : "group-hover:underline"
                }`}
              >
                {momentData.title}
              </p>

              {/* Inscrits */}
              {momentData.registrationCount > 0 && (
                <div className={`flex items-center gap-1 text-xs ${isPast ? "text-muted-foreground/60" : "text-muted-foreground"}`}>
                  <Users className="size-3 shrink-0" />
                  <span>{tMoment("registrations.registered", { count: momentData.registrationCount })}</span>
                </div>
              )}

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

              {/* Community */}
              <span
                className={`flex min-w-0 items-center gap-1.5 pt-0.5 text-xs ${
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
            </div>

            {/* Cover — RIGHT, alignée avec le titre */}
            {momentData.coverImage ? (
              <Image
                src={momentData.coverImage}
                alt={momentData.title}
                width={90}
                height={90}
                className={`mt-[26px] size-[90px] shrink-0 rounded-xl object-cover ${isPast ? "opacity-40 grayscale" : ""}`}
              />
            ) : (
              <div
                className={`mt-[26px] size-[90px] shrink-0 rounded-xl ${isPast ? "opacity-40 grayscale" : ""}`}
                style={{ background: gradient }}
              />
            )}
          </div>
        </Link>
      </div>
    </div>
  );
}
