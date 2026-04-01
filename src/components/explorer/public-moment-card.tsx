"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { getMomentGradient } from "@/lib/gradient";
import { formatShortDate, formatTime } from "@/lib/format-date";
import { MapPin, Globe, Crown, Clock, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CategoryBadge } from "@/components/badges/category-badge";
import type { PublicMoment } from "@/domain/ports/repositories/moment-repository";
import type { RegistrationStatus } from "@/domain/models/registration";
import { DemoBadge } from "@/components/badges/demo-badge";
import { AttendeeAvatarStack } from "@/components/moments/attendee-avatar-stack";
import { resolveCategoryLabel } from "@/lib/circle-category-helpers";

type Props = {
  moment: PublicMoment;
  registrationStatus?: RegistrationStatus | null;
  isOrganizer?: boolean;
};

export function PublicMomentCard({ moment, registrationStatus, isOrganizer }: Props) {
  const t = useTranslations("Explorer");
  const tCategory = useTranslations("CircleCategory");
  const locale = useLocale();

  const gradient = getMomentGradient(moment.title);

  const startsAt = new Date(moment.startsAt);
  const dateStr = formatShortDate(startsAt, locale);
  const timeStr = formatTime(startsAt);

  const isOnline = moment.locationType === "ONLINE" || moment.locationType === "HYBRID";
  const locationLabel = isOnline
    ? t("momentCard.online")
    : moment.locationName ?? null;

  const LocationIcon = isOnline ? Globe : MapPin;

  const overflow = moment.registrationCount - moment.topAttendees.length;
  const attendeeLabel =
    overflow > 0
      ? t("momentCard.moreRegistered", { count: overflow })
      : t("momentCard.registeredCount", { count: moment.registrationCount });

  // Badge rôle — inline dans la meta row
  const roleBadge = isOrganizer ? (
    <Badge variant="outline" className="shrink-0 gap-1 border-primary/40 text-xs text-primary">
      <Crown className="size-3" />
      {t("momentCard.roleBadge.host")}
    </Badge>
  ) : registrationStatus === "REGISTERED" || registrationStatus === "CHECKED_IN" ? (
    <Badge variant="outline" className="shrink-0 gap-1 border-primary/40 text-xs text-primary">
      <Check className="size-3" />
      {t("momentCard.roleBadge.registered")}
    </Badge>
  ) : registrationStatus === "WAITLISTED" ? (
    <Badge variant="secondary" className="shrink-0 gap-1 text-xs">
      <Clock className="size-3" />
      {t("momentCard.roleBadge.waitlisted")}
    </Badge>
  ) : null;

  const categoryLabelText = resolveCategoryLabel(moment.circle.category, moment.circle.customCategory, tCategory);
  const categoryLabel = categoryLabelText ? <CategoryBadge label={categoryLabelText} /> : null;

  const cityLabel = moment.circle.city && (
    <span className="flex items-center gap-1 text-muted-foreground text-xs">
      <MapPin className="size-3 shrink-0" />
      {moment.circle.city}
    </span>
  );

  // Colonne droite desktop : toujours le badge date
  const rightColumn = (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-muted/50 px-3 py-2 text-center min-w-[52px]">
      <span className="text-lg font-bold leading-none" suppressHydrationWarning>
        {startsAt.getDate()}
      </span>
      <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground" suppressHydrationWarning>
        {startsAt.toLocaleDateString(locale, { month: "short" })}
      </span>
    </div>
  );

  return (
    <Link href={`/m/${moment.slug}`} className="group block min-w-0">
      <div className="bg-card dark:bg-[oklch(0.22_0.04_281.8)] overflow-hidden rounded-2xl border p-3 sm:p-4 shadow-lg dark:shadow-none transition-colors hover:border-primary/30">
        <div className="flex items-center gap-5 sm:gap-6">

          {/* Cover — 80px mobile / 140px desktop */}
          <div
            className="relative size-[80px] sm:size-[140px] shrink-0 overflow-hidden rounded-xl"
            style={moment.coverImage ? undefined : { background: gradient }}
          >
            {moment.coverImage && (
              <Image
                src={moment.coverImage}
                alt={moment.title}
                width={140}
                height={140}
                className="size-full object-cover"
                sizes="140px"
              />
            )}
            {moment.circle.isDemo && <DemoBadge label={t("circleCard.demo")} />}
          </div>

          {/* Body */}
          <div className="min-w-0 flex-1 space-y-1 sm:space-y-1.5">
            {categoryLabel && (
              <div className="flex flex-wrap items-center gap-1.5">
                {categoryLabel}
              </div>
            )}
            <span className="inline-flex max-w-full truncate rounded-full border border-foreground/20 bg-muted/50 px-3 py-0.5 text-xs text-muted-foreground">
              {moment.circle.name}
            </span>
            <h3 className="line-clamp-2 text-sm sm:text-base font-semibold leading-snug group-hover:underline">
              {moment.title}
            </h3>
            {moment.description && (
              <p className="text-muted-foreground line-clamp-1 text-xs sm:text-sm">
                {moment.description}
              </p>
            )}
            <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
              <span suppressHydrationWarning>{dateStr} · {timeStr}</span>
              {locationLabel && (
                <div className="flex items-center gap-1">
                  <LocationIcon className="size-3 shrink-0" />
                  <span className="truncate">{locationLabel}</span>
                </div>
              )}
            </div>
            {(moment.registrationCount > 0 || roleBadge) && (
              <div className="flex items-center gap-2">
                {moment.registrationCount > 0 && (
                  <AttendeeAvatarStack
                    attendees={moment.topAttendees}
                    totalCount={moment.registrationCount}
                    label={attendeeLabel}
                  />
                )}
                {roleBadge}
              </div>
            )}
          </div>

          {/* Right column — desktop only */}
          <div className="hidden sm:flex shrink-0 items-center ml-8">
            {rightColumn}
          </div>

        </div>
      </div>
    </Link>
  );
}
