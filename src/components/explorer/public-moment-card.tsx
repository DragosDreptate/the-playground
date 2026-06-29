"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { getMomentGradient, COVER_IMAGE_BG } from "@/lib/gradient";
import { formatTime, formatWeekdayAndDate, formatDayMonthShort } from "@/lib/format-date";
import { MapPin, Globe } from "lucide-react";
import { CARD_HOVER_GROUP, IconPill, CirclePill, StatusPill, TimelineScaffold, REGISTRATION_PILL } from "@/components/cards/card-primitives";
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
  /** Dernier de la liste : la ligne verticale de la timeline ne descend pas. */
  isLast?: boolean;
};

/**
 * Carte d'événement d'Explorer en **timeline** (structure responsive unique, sur le
 * modèle de `dashboard-moment-card`) : colonne date + dot + ligne, puis carte avec
 * contexte Communauté, titre, lieu, social proof et cover à droite. Mobile (`< sm`) :
 * compact (colonne 72px, cover 80px, lieu en icône, description masquée, badge de
 * statut en icône seule) ; desktop (`≥ sm`) : rendu inchangé (#598).
 */
export function PublicMomentCard({ moment, registrationStatus, isOrganizer, isLast = false }: Props) {
  const t = useTranslations("Explorer");
  const tCircle = useTranslations("Circle");
  const tCategory = useTranslations("CircleCategory");
  const locale = useLocale();

  const gradient = getMomentGradient(moment.title);

  const startsAt = new Date(moment.startsAt);
  const timeStr = formatTime(startsAt);
  const { weekday, dateStr: columnDate } = formatWeekdayAndDate(startsAt, locale);
  const columnDateShort = formatDayMonthShort(startsAt, locale);

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

  // Ligne de rattachement — pill Communauté seul en mobile ; thème + pill en desktop.
  const contextLine = (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      {categoryBadge && <span className="hidden sm:inline-flex">{categoryBadge}</span>}
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
    <TimelineScaffold
      dotClass="bg-primary"
      isLast={isLast}
      cardPadding="pl-1 sm:pl-4"
      dateColumn={
        <div className="w-[55px] shrink-0 pr-1 pt-1 text-right sm:w-[100px] sm:pr-4">
          {isToday ? (
            <span className="inline-block rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
              <span className="sm:hidden">{tCircle("detail.todayShort")}</span>
              <span className="hidden sm:inline">{tCircle("detail.today")}</span>
            </span>
          ) : (
            <>
              <p className="text-muted-foreground text-xs" suppressHydrationWarning>
                {weekday}
              </p>
              <p className="text-sm font-medium leading-snug" suppressHydrationWarning>
                <span className="sm:hidden">{columnDateShort}</span>
                <span className="hidden sm:inline">{columnDate}</span>
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
        <div
          className={`bg-card flex items-center gap-3 overflow-hidden rounded-xl border p-3 shadow-lg dark:shadow-none sm:gap-6 sm:rounded-2xl sm:p-4 ${CARD_HOVER_GROUP}`}
        >
          <div className="min-w-0 flex-1 space-y-1.5">
            {contextLine}
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug sm:text-base">{moment.title}</h3>
            {moment.description && (
              <p className="text-muted-foreground hidden line-clamp-1 text-sm sm:block">{moment.description}</p>
            )}
            {locationLabel && (
              <>
                {/* Mobile : lieu en icône simple */}
                <div className="text-muted-foreground flex items-center gap-1.5 text-xs sm:hidden">
                  <LocationIcon className="size-3.5 shrink-0" />
                  <span className="truncate">{locationLabel}</span>
                </div>
                {/* Desktop : lieu en pastille */}
                <div className="text-muted-foreground hidden items-center gap-2 text-sm sm:flex">
                  <IconPill icon={LocationIcon} size="md" />
                  <span className="truncate">{locationLabel}</span>
                </div>
              </>
            )}
            {socialRow}
          </div>

          {/* Cover — à droite (80px mobile / 160px desktop) */}
          <div
            className={`relative size-[80px] shrink-0 overflow-hidden rounded-xl sm:size-[160px] ${moment.coverImage ? COVER_IMAGE_BG : ""}`}
            style={moment.coverImage ? undefined : { background: gradient }}
          >
            {moment.coverImage && (
              <Image
                src={moment.coverImage}
                alt={moment.title}
                width={160}
                height={160}
                className="size-full object-cover"
                sizes="(max-width: 640px) 80px, 160px"
              />
            )}
            {moment.circle.isDemo && <DemoBadge label={t("circleCard.demo")} />}
          </div>
        </div>
      </Link>
    </TimelineScaffold>
  );
}
