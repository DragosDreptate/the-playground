"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { getMomentGradient, COVER_IMAGE_BG } from "@/lib/gradient";
import { formatShortDate, formatTime, formatWeekdayAndDate } from "@/lib/format-date";
import { MapPin, Globe } from "lucide-react";
import { CARD_HOVER, CARD_HOVER_GROUP, IconPill, CirclePill, StatusPill, TimelineScaffold, REGISTRATION_PILL } from "@/components/cards/card-primitives";
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
  /** Dernier de la liste : la ligne verticale de la timeline (≥ sm) ne descend pas. */
  isLast?: boolean;
};

export function PublicMomentCard({ moment, registrationStatus, isOrganizer, isLast = false }: Props) {
  const t = useTranslations("Explorer");
  const tCircle = useTranslations("Circle");
  const tCategory = useTranslations("CircleCategory");
  const locale = useLocale();

  const gradient = getMomentGradient(moment.title);

  const startsAt = new Date(moment.startsAt);
  const shortDate = formatShortDate(startsAt, locale);
  const timeStr = formatTime(startsAt);
  const { weekday, dateStr: columnDate } = formatWeekdayAndDate(startsAt, locale);

  // « Aujourd'hui » calculé côté client pour éviter un mismatch d'hydratation.
  const [isToday, setIsToday] = useState(false);
  useEffect(() => {
    setIsToday(startsAt.toDateString() === new Date().toDateString());
  }, [startsAt]);

  const isOnline = moment.locationType === "ONLINE" || moment.locationType === "HYBRID";
  const locationLabel = isOnline ? t("momentCard.online") : (moment.locationName ?? null);
  const LocationIcon = isOnline ? Globe : MapPin;

  const overflow = moment.registrationCount - moment.topAttendees.length;
  const attendeeLabel =
    overflow > 0
      ? t("momentCard.moreRegistered", { count: overflow })
      : t("momentCard.registeredCount", { count: moment.registrationCount });

  const roleBadge = isOrganizer ? (
    <StatusPill {...REGISTRATION_PILL.host} label={t("momentCard.roleBadge.host")} hideLabelOnMobile />
  ) : registrationStatus === "REGISTERED" || registrationStatus === "CHECKED_IN" ? (
    <StatusPill {...REGISTRATION_PILL.registered} label={t("momentCard.roleBadge.registered")} hideLabelOnMobile />
  ) : registrationStatus === "PENDING_APPROVAL" ? (
    <StatusPill {...REGISTRATION_PILL.pendingApproval} label={t("momentCard.roleBadge.pendingApproval")} hideLabelOnMobile />
  ) : registrationStatus === "WAITLISTED" ? (
    <StatusPill {...REGISTRATION_PILL.waitlisted} label={t("momentCard.roleBadge.waitlisted")} hideLabelOnMobile />
  ) : null;

  const categoryLabelText = resolveCategoryLabel(
    moment.circle.category,
    moment.circle.customCategory,
    tCategory
  );
  const categoryBadge = categoryLabelText ? <CategoryBadge label={categoryLabelText} /> : null;

  const circlePill = <CirclePill name={moment.circle.name} />;

  // Timeline desktop : une seule ligne de rattachement — thème (icône) + pill Communauté.
  const contextLine = (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      {categoryBadge}
      <CirclePill name={moment.circle.name} withIcon />
    </div>
  );

  const socialRow =
    moment.registrationCount > 0 || roleBadge ? (
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
    ) : null;

  return (
    <>
      {/* ─── Mobile (< sm) : carte horizontale. Structure d'origine, mais fond aligné
           sur le token --card et hover neutre unifiés (#597, comme desktop). ─── */}
      <Link href={`/m/${moment.slug}`} className="sm:hidden group block min-w-0">
        <div className={`bg-card overflow-hidden rounded-2xl border p-3 shadow-lg dark:shadow-none ${CARD_HOVER}`}>
          <div className="flex items-center gap-5">
            <div
              className={`relative size-[80px] shrink-0 overflow-hidden rounded-xl ${moment.coverImage ? COVER_IMAGE_BG : ""}`}
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

            <div className="min-w-0 flex-1 space-y-1">
              {categoryBadge && (
                <div className="flex flex-wrap items-center gap-1.5">{categoryBadge}</div>
              )}
              {circlePill}
              <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{moment.title}</h3>
              {moment.description && (
                <p className="text-muted-foreground line-clamp-1 text-xs">{moment.description}</p>
              )}
              <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                <span suppressHydrationWarning>
                  {shortDate} · {timeStr}
                </span>
                {locationLabel && (
                  <div className="flex items-center gap-1">
                    <LocationIcon className="size-3 shrink-0" />
                    <span className="truncate">{locationLabel}</span>
                  </div>
                )}
              </div>
              {socialRow}
            </div>
          </div>
        </div>
      </Link>

      {/* ─── Desktop / tablette (≥ sm) : timeline — NOUVEAU ─── */}
      <TimelineScaffold
        dotClass="bg-primary"
        isLast={isLast}
        className="hidden sm:flex group gap-0"
        cardPadding="pl-4"
        dateColumn={
          <div className="w-[100px] shrink-0 pr-4 pt-1 text-right">
            {isToday ? (
              <span className="inline-block rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                {tCircle("detail.today")}
              </span>
            ) : (
              <>
                <p className="text-muted-foreground text-xs" suppressHydrationWarning>
                  {weekday}
                </p>
                <p className="text-sm font-medium leading-snug" suppressHydrationWarning>
                  {columnDate}
                </p>
              </>
            )}
            <p className="text-muted-foreground mt-0.5 text-xs" suppressHydrationWarning>
              {timeStr}
            </p>
          </div>
        }
      >
          <Link href={`/m/${moment.slug}`} className="block">
            <div className={`bg-card flex items-center gap-6 overflow-hidden rounded-2xl border p-4 shadow-lg dark:shadow-none ${CARD_HOVER_GROUP}`}>
              <div className="min-w-0 flex-1 space-y-1.5">
                {contextLine}
                <h3 className="line-clamp-2 text-base font-semibold leading-snug">{moment.title}</h3>
                {moment.description && (
                  <p className="text-muted-foreground line-clamp-1 text-sm">{moment.description}</p>
                )}
                {locationLabel && (
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <IconPill icon={LocationIcon} size="md" />
                    <span className="truncate">{locationLabel}</span>
                  </div>
                )}
                {socialRow}
              </div>

              {/* Cover — à droite (timeline) */}
              <div
                className={`relative size-[160px] shrink-0 overflow-hidden rounded-xl ${moment.coverImage ? COVER_IMAGE_BG : ""}`}
                style={moment.coverImage ? undefined : { background: gradient }}
              >
                {moment.coverImage && (
                  <Image
                    src={moment.coverImage}
                    alt={moment.title}
                    width={160}
                    height={160}
                    className="size-full object-cover"
                    sizes="160px"
                  />
                )}
                {moment.circle.isDemo && <DemoBadge label={t("circleCard.demo")} />}
              </div>
            </div>
          </Link>
      </TimelineScaffold>
    </>
  );
}
