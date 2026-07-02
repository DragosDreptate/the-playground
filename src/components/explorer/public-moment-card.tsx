"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { getMomentGradient, COVER_IMAGE_BG } from "@/lib/gradient";
import { formatTime, formatWeekdayAndDate, formatDayMonthShort, isSameDayInParis } from "@/lib/format-date";
import { MapPin, Globe, Clock } from "lucide-react";
import { CARD_HOVER_GROUP, IconPill, CirclePill, TimelineScaffold } from "@/components/cards/card-primitives";
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
 * compact (colonne 72px, cover 80px, lieu en icône, description masquée) ; desktop
 * (`≥ sm`) : rendu inchangé (#598). Pas de badge de statut/rôle (découverte).
 */
export function PublicMomentCard({ moment, isLast = false }: Props) {
  const t = useTranslations("Explorer");
  const tCircle = useTranslations("Circle");
  const tCategory = useTranslations("CircleCategory");
  const locale = useLocale();

  const gradient = getMomentGradient(moment.title);

  const startsAt = new Date(moment.startsAt);
  const timeStr = formatTime(startsAt);
  const { weekday, dateStr: columnDate } = formatWeekdayAndDate(startsAt, locale);
  const columnDateShort = formatDayMonthShort(startsAt, locale);
  // « Aujourd'hui » ancré sur Europe/Paris (cohérent avec la carte sœur de la page
  // Communauté), pas sur le fuseau du navigateur. Calculé côté client après montage :
  // la page Explorer est mise en cache (ISR), un calcul au render figerait le badge au
  // snapshot et provoquerait un mismatch d'hydratation au passage de minuit.
  const [isToday, setIsToday] = useState(false);
  useEffect(() => {
    setIsToday(isSameDayInParis(startsAt, new Date()));
  }, [startsAt]);

  const isOnline = moment.locationType === "ONLINE" || moment.locationType === "HYBRID";
  const locationLabel = isOnline
    ? t("momentCard.online")
    : (moment.locationName ?? moment.locationAddress ?? null);
  const LocationIcon = isOnline ? Globe : MapPin;

  const overflow = moment.registrationCount - moment.topAttendees.length;
  const attendeeLabel =
    overflow > 0
      ? t("momentCard.moreRegistered", { count: overflow })
      : t("momentCard.registeredCount", { count: moment.registrationCount });

  // Explorer (découverte) : aucun badge de statut/rôle perso sur les cartes événement.
  // Le rôle (Organisateur / Inscrit) est de l'info secondaire en découverte ; il vit dans
  // Mon espace. Voir spec/design/badges-strategie.md.

  const categoryLabelText = resolveCategoryLabel(
    moment.circle.category,
    moment.circle.customCategory,
    tCategory
  );
  const categoryBadge = categoryLabelText ? <CategoryBadge label={categoryLabelText} /> : null;

  // Ligne de rattachement — pill Communauté seul en mobile ; thème + pill en desktop.
  const contextLine = (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <CirclePill name={moment.circle.name} withIcon />
      {categoryBadge && <span className="hidden sm:inline-flex">{categoryBadge}</span>}
    </div>
  );

  const socialRow =
    moment.registrationCount > 0 ? (
      <AttendeeAvatarStack
        attendees={moment.topAttendees}
        totalCount={moment.registrationCount}
        label={attendeeLabel}
      />
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
          {/* Heure en colonne : mobile uniquement (en desktop elle est dans la carte). */}
          <p className="text-muted-foreground mt-0.5 text-xs sm:hidden" suppressHydrationWarning>
            {timeStr}
          </p>
        </div>
      }
    >
      <Link href={`/m/${moment.slug}`} className="block">
        <div
          className={`bg-card flex flex-col gap-2 overflow-hidden rounded-xl border p-3 shadow-lg dark:shadow-none sm:flex-row sm:items-center sm:gap-6 sm:rounded-2xl sm:p-4 ${CARD_HOVER_GROUP}`}
        >
          {/* Titre — pleine largeur au-dessus, une seule ligne (mobile uniquement) */}
          <h3 className="truncate text-base font-semibold leading-snug sm:hidden">{moment.title}</h3>

          {/* Rangée infos | cover. En desktop, `contents` dissout ce wrapper :
              body et cover redeviennent enfants directs de la carte (layout #598). */}
          <div className="flex items-start gap-3 sm:contents">
            <div className="min-w-0 flex-1 space-y-[8px] sm:space-y-[7px]">
              {contextLine}
              <h3 className="hidden text-base font-semibold leading-snug sm:line-clamp-1">{moment.title}</h3>
              {moment.description && (
                <p className="text-muted-foreground hidden text-sm sm:line-clamp-2">{moment.description}</p>
              )}
              {/* Mobile : lieu en pastille (l'heure est dans la colonne date). */}
              {locationLabel && (
                <div className="text-muted-foreground flex items-center gap-1.5 text-xs sm:hidden">
                  <IconPill icon={LocationIcon} size="sm" />
                  <span className="truncate">{locationLabel}</span>
                </div>
              )}
              {/* Desktop : heure + lieu en pastilles, même rendu que Mon espace. */}
              <div className="text-muted-foreground hidden items-center gap-3 text-xs sm:flex">
                <span className="flex shrink-0 items-center gap-1.5">
                  <IconPill icon={Clock} size="sm" />
                  <span suppressHydrationWarning>{timeStr}</span>
                </span>
                {locationLabel && (
                  <span className="flex min-w-0 items-center gap-1.5">
                    <IconPill icon={LocationIcon} size="sm" />
                    <span className="truncate">{locationLabel}</span>
                  </span>
                )}
              </div>
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
        </div>
      </Link>
    </TimelineScaffold>
  );
}
