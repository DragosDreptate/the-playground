"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { getMomentGradient } from "@/lib/gradient";
import { MapPin, Globe, Users, Crown, Clock, CalendarIcon } from "lucide-react";
import type { PublicMoment } from "@/domain/ports/repositories/moment-repository";
import type { RegistrationStatus } from "@/domain/models/registration";

type Props = {
  moment: PublicMoment;
  registrationStatus?: RegistrationStatus | null;
  isOrganizer?: boolean;
};

export function PublicMomentCard({ moment, registrationStatus, isOrganizer }: Props) {
  const t = useTranslations("Explorer");
  const tCategory = useTranslations("CircleCategory");

  const gradient = getMomentGradient(moment.title);

  const startsAt = new Date(moment.startsAt);
  const dateStr = startsAt.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const timeStr = startsAt.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isOnline = moment.locationType === "ONLINE" || moment.locationType === "HYBRID";
  const locationLabel = isOnline
    ? t("momentCard.online")
    : moment.locationName ?? null;

  const LocationIcon = isOnline ? Globe : MapPin;

  const spotsRemaining =
    moment.capacity !== null
      ? moment.capacity - moment.registrationCount
      : null;

  // Badge rôle — pill outline rose (même style que les cartes Communauté)
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

  // Catégorie — texte plain bold blanc (pas un pill badge)
  const categoryLabel = moment.circle.category && (
    <span className="text-xs font-semibold text-foreground">
      {tCategory(moment.circle.category)}
    </span>
  );

  const cityLabel = moment.circle.city && (
    <span className="text-muted-foreground text-xs">{moment.circle.city}</span>
  );

  const stats = (
    <div className="text-muted-foreground flex items-center gap-3 text-xs">
      {locationLabel && (
        <div className="flex items-center gap-1">
          <LocationIcon className="size-3.5 shrink-0" />
          <span className="truncate">{locationLabel}</span>
        </div>
      )}
      <div className="flex items-center gap-1 shrink-0">
        <Users className="size-3.5 shrink-0" />
        {spotsRemaining !== null && spotsRemaining > 0 ? (
          <span>{t("momentCard.spotsRemaining", { count: spotsRemaining })}</span>
        ) : (
          <span>{t("momentCard.registeredCount", { count: moment.registrationCount })}</span>
        )}
      </div>
    </div>
  );

  return (
    <Link href={`/m/${moment.slug}`} className="group block min-w-0">
      <div className="bg-card overflow-hidden rounded-2xl border p-4 transition-colors hover:border-primary/30 sm:p-5">

        {/* ── Mobile: compact horizontal ── */}
        <div className="sm:hidden">
          <div className="flex items-start gap-3">
            {/* Thumbnail carré 72px */}
            <div
              className="size-[72px] shrink-0 overflow-hidden rounded-xl"
              style={moment.coverImage ? undefined : { background: gradient }}
            >
              {moment.coverImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={moment.coverImage}
                  alt={moment.title}
                  className="size-full object-cover"
                />
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {categoryLabel}
                {roleBadge}
                {cityLabel}
              </div>
              <p className="truncate text-xs font-semibold text-foreground">
                {moment.circle.name}
              </p>
              <h3 className="truncate text-sm font-semibold group-hover:underline">
                {moment.title}
              </h3>
              <p className="text-muted-foreground text-xs">{dateStr} · {timeStr}</p>
              {locationLabel && (
                <div className="text-muted-foreground flex items-center gap-1 text-xs">
                  <LocationIcon className="size-3.5 shrink-0" />
                  <span className="truncate">{locationLabel}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Desktop: vertical card ── */}
        <div className="hidden sm:block">
          {/* Cover — image ou gradient 1:1 */}
          <div className="relative mb-4">
            <div
              className="absolute inset-x-4 -bottom-2 h-6 opacity-50 blur-xl"
              style={{ background: gradient }}
            />
            <div className="relative aspect-square w-full overflow-hidden rounded-xl">
              {moment.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={moment.coverImage}
                  alt={moment.title}
                  className="size-full object-cover"
                />
              ) : (
                <>
                  <div className="size-full" style={{ background: gradient }} />
                  <div className="absolute inset-0 bg-black/15" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex size-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                      <CalendarIcon className="size-4 text-white" />
                    </div>
                  </div>
                </>
              )}
              {/* Date en overlay bas-gauche */}
              <div className="absolute bottom-2.5 left-2.5 rounded-lg border border-white/10 bg-black/55 px-2.5 py-1 backdrop-blur-md">
                <span className="text-xs font-semibold text-white">{dateStr} · {timeStr}</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {categoryLabel}
              {roleBadge}
              {cityLabel}
            </div>
            <p className="text-xs font-semibold text-foreground">
              {moment.circle.name}
            </p>
            <h3 className="font-semibold leading-snug group-hover:underline">
              {moment.title}
            </h3>
            {stats}
          </div>
        </div>

      </div>
    </Link>
  );
}
