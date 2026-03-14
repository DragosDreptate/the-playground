"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { getMomentGradient } from "@/lib/gradient";
import { formatShortDate, formatTime } from "@/lib/format-date";
import { MapPin, Globe, Users, Crown, Clock } from "lucide-react";
import type { PublicMoment } from "@/domain/ports/repositories/moment-repository";
import type { RegistrationStatus } from "@/domain/models/registration";
import { DemoBadge } from "@/components/badges/demo-badge";

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

  const spotsRemaining =
    moment.capacity !== null
      ? moment.capacity - moment.registrationCount
      : null;

  // Badge rôle — inline dans la meta row
  const roleBadge = isOrganizer ? (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/40 bg-primary/5 px-1.5 py-0.5 text-xs font-semibold text-primary">
      <Crown className="size-3" aria-hidden="true" />
      {t("momentCard.roleBadge.host")}
    </span>
  ) : registrationStatus === "REGISTERED" || registrationStatus === "CHECKED_IN" ? (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/40 bg-primary/5 px-1.5 py-0.5 text-xs font-semibold text-primary">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      {t("momentCard.roleBadge.registered")}
    </span>
  ) : registrationStatus === "WAITLISTED" ? (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/40 bg-primary/5 px-1.5 py-0.5 text-xs font-semibold text-primary">
      <Clock className="size-3" aria-hidden="true" />
      {t("momentCard.roleBadge.waitlisted")}
    </span>
  ) : null;

  const categoryLabel = moment.circle.category && (
    <span className="text-xs font-semibold text-foreground">
      {tCategory(moment.circle.category)}
    </span>
  );

  const cityLabel = moment.circle.city && (
    <span className="text-muted-foreground text-xs">{moment.circle.city}</span>
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
      <div className="bg-card overflow-hidden rounded-2xl border p-3 sm:p-4 transition-colors hover:border-primary/30">
        <div className="flex items-center gap-3 sm:gap-4">

          {/* Cover — 72px mobile / 120px desktop */}
          <div
            className="relative size-[72px] sm:size-[120px] shrink-0 overflow-hidden rounded-xl"
            style={moment.coverImage ? undefined : { background: gradient }}
          >
            {moment.coverImage && (
              <Image
                src={moment.coverImage}
                alt={moment.title}
                width={120}
                height={120}
                className="size-full object-cover"
                sizes="120px"
              />
            )}
            {moment.circle.isDemo && <DemoBadge label={t("circleCard.demo")} />}
          </div>

          {/* Body */}
          <div className="min-w-0 flex-1 space-y-1 sm:space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {categoryLabel}
              {roleBadge}
              {moment.circle.isDemo && <DemoBadge label={t("circleCard.demo")} inline />}
              {cityLabel}
            </div>
            <p className="truncate text-xs font-semibold text-foreground">
              {moment.circle.name}
            </p>
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
              <div className="flex items-center gap-1 shrink-0">
                <Users className="size-3 shrink-0" />
                {spotsRemaining !== null && spotsRemaining > 0 ? (
                  <span>{t("momentCard.spotsRemaining", { count: spotsRemaining })}</span>
                ) : (
                  <span>{t("momentCard.registeredCount", { count: moment.registrationCount })}</span>
                )}
              </div>
            </div>
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
