"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DraftBadge } from "@/components/badges/draft-badge";
import { MapPin, Globe, Clock, XCircle } from "lucide-react";
import { CARD_HOVER_GROUP, IconPill, CirclePill, StatusPill, TimelineScaffold, REGISTRATION_PILL, momentDotClass } from "@/components/cards/card-primitives";
import { AttendeeAvatarStack } from "@/components/moments/attendee-avatar-stack";
import { getMomentGradient, COVER_IMAGE_BG } from "@/lib/gradient";
import { formatWeekdayAndDate, formatTime, formatDayMonthShort, isSameDayInParis } from "@/lib/format-date";

import type { RegistrationWithMoment } from "@/domain/models/registration";
import type { HostMomentSummary } from "@/domain/models/moment";

type ParticipantProps = {
  variant: "participant";
  registration: RegistrationWithMoment;
  isLast: boolean;
  isOrganizer?: boolean;
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

  const isOrganizerView = props.variant === "organizer";
  const isPast = props.isPast ?? false;
  const isLast = props.isLast;
  const isDraft = isOrganizerView && (props as OrganizerProps).moment.status === "DRAFT";

  // Extraire les données selon le variant
  const momentData = isOrganizerView
    ? {
        slug: props.moment.slug,
        title: props.moment.title,
        coverImage: props.moment.coverImage,
        startsAt: props.moment.startsAt,
        status: props.moment.status,
        locationType: props.moment.locationType,
        locationName: props.moment.locationName,
        locationAddress: props.moment.locationAddress,
        circleSlug: props.moment.circle.slug,
        circleName: props.moment.circle.name,
        circleCoverImage: props.moment.circle.coverImage,
        registrationCount: props.moment.registrationCount,
        topAttendees: props.moment.topAttendees,
      }
    : {
        slug: props.registration.moment.slug,
        title: props.registration.moment.title,
        coverImage: props.registration.moment.coverImage,
        startsAt: props.registration.moment.startsAt,
        status: props.registration.moment.status,
        locationType: props.registration.moment.locationType,
        locationName: props.registration.moment.locationName,
        locationAddress: props.registration.moment.locationAddress,
        circleSlug: props.registration.moment.circleSlug,
        circleName: props.registration.moment.circleName,
        circleCoverImage: props.registration.moment.circleCoverImage,
        registrationCount: props.registration.moment.registrationCount,
        topAttendees: props.registration.moment.topAttendees,
      };

  // « Aujourd'hui » ancré sur Europe/Paris, pas sur le fuseau du navigateur. Calculé
  // côté client après montage pour éviter tout mismatch d'hydratation si le HTML est
  // servi après le passage de minuit.
  const [isToday, setIsToday] = useState(false);
  useEffect(() => {
    setIsToday(isSameDayInParis(momentData.startsAt, new Date()));
  }, [momentData.startsAt]);

  const isCancelled = momentData.status === "CANCELLED";
  const isOrganizer = !isOrganizerView && (props as ParticipantProps).isOrganizer === true;
  const isRegistered =
    !isOrganizerView &&
    !isOrganizer &&
    (props.registration.status === "REGISTERED" ||
      props.registration.status === "CHECKED_IN");
  const isWaitlisted = !isOrganizerView && !isOrganizer && props.registration.status === "WAITLISTED";
  const isPendingApproval =
    !isOrganizerView && !isOrganizer && props.registration.status === "PENDING_APPROVAL";

  const dotClass = momentDotClass({
    isCancelled,
    isPast,
    isDraft,
    isAmber: isWaitlisted || isPendingApproval,
    // Actif : rose pour le Host/inscrit, neutre pour une inscription inactive.
    defaultClass: isOrganizerView || isOrganizer || isRegistered ? "bg-primary" : "bg-border",
  });

  const cardBorderClass = isCancelled
    ? "border-destructive/20"
    : isDraft
      ? "border-dashed border-muted-foreground/30 opacity-70"
      : "border-border";

  const gradient = getMomentGradient(momentData.title);
  const { weekday, dateStr } = formatWeekdayAndDate(momentData.startsAt, locale);
  const dateStrShort = formatDayMonthShort(momentData.startsAt, locale);
  const timeStr = formatTime(momentData.startsAt);

  // Repli sur l'adresse quand aucun lieu nommé n'est saisi, comme la timeline
  // de la page Communauté (moment-timeline-item).
  const locationLabel =
    momentData.locationType === "ONLINE"
      ? t("online")
      : momentData.locationType === "HYBRID"
        ? t("hybrid")
        : momentData.locationName ?? momentData.locationAddress;

  const waitlistedBadge = !isCancelled && !isPast && !isDraft && isWaitlisted ? (
    <StatusPill {...REGISTRATION_PILL.waitlisted} label={t("registrationStatus.waitlisted")} hideLabelOnMobile />
  ) : null;

  const pendingApprovalBadge = !isCancelled && !isPast && !isDraft && isPendingApproval ? (
    <StatusPill {...REGISTRATION_PILL.pendingApproval} label={t("registrationStatus.pending_approval")} hideLabelOnMobile />
  ) : null;

  // Pas de badge Organisateur sur Mon espace : la distinction organisateur/participant
  // est déjà portée par le toggle « Organisateur » du filtre. On ne montre donc que
  // les statuts d'inscription non redondants (en attente, liste d'attente).

  const attendeeStack =
    !isCancelled && momentData.registrationCount > 0 ? (
      <AttendeeAvatarStack
        attendees={momentData.topAttendees}
        totalCount={momentData.registrationCount}
        label={
          momentData.topAttendees.length < momentData.registrationCount
            ? tMoment("registrations.moreRegistered", { count: momentData.registrationCount - momentData.topAttendees.length })
            : tMoment("registrations.registered", { count: momentData.registrationCount })
        }
      />
    ) : null;

  const LocationIcon = momentData.locationType === "IN_PERSON" ? MapPin : Globe;

  return (
    <TimelineScaffold
      dotClass={dotClass}
      isLast={isLast}
      cardPadding="pl-1 sm:pl-4"
      dateColumn={
        <div className="w-[55px] shrink-0 pr-1 pt-1 text-right sm:w-[100px] sm:pr-4">
          {!isPast && isToday ? (
            <span className="inline-block rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
              <span className="sm:hidden">{tCircle("detail.todayShort")}</span>
              <span className="hidden sm:inline">{tCircle("detail.today")}</span>
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
                <span className="sm:hidden">{dateStrShort}</span>
                <span className="hidden sm:inline">{dateStr}</span>
              </p>
            </>
          )}
          <p
            className={`mt-0.5 text-xs sm:hidden ${isPast ? "text-muted-foreground/60" : "text-muted-foreground"}`}
            suppressHydrationWarning
          >
            {timeStr}
          </p>
        </div>
      }
    >
      <Link
        href={`/dashboard/circles/${momentData.circleSlug}/moments/${momentData.slug}`}
        className="block"
      >
          <div
            className={`bg-card flex flex-col rounded-xl border shadow-lg dark:shadow-none ${CARD_HOVER_GROUP} ${cardBorderClass}`}
          >
            {/* Bandeau annulation — calqué sur la timeline de la page Communauté */}
            {isCancelled && (
              <div className="flex items-center gap-2 rounded-t-xl border-b border-destructive/20 bg-destructive/10 px-4 py-2">
                <XCircle className="size-3.5 shrink-0 text-destructive" />
                <span className="text-destructive text-xs font-medium">
                  {tMoment("public.eventCancelled")}
                </span>
              </div>
            )}

            {/* Corps de la carte */}
            <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-3">
              {/* Titre — pleine largeur au-dessus, une ligne (mobile uniquement) */}
              <p
                className={`truncate text-base font-semibold leading-snug sm:hidden ${
                  isCancelled
                    ? "text-muted-foreground line-through"
                    : isPast
                      ? "text-muted-foreground"
                      : ""
                }`}
              >
                {momentData.title}
              </p>

              {/* Rangée infos | cover. En desktop, `contents` dissout ce wrapper (layout #598). */}
              <div className="flex items-start gap-3 sm:contents">
                <div className="min-w-0 flex-1">
                  {/* === MOBILE — body identique aux cartes Explorer (sm:hidden) === */}
                  <div className="space-y-[7px] sm:hidden">
                    <CirclePill name={momentData.circleName} withIcon muted={isPast || isCancelled} />
                    {locationLabel && (
                      <div
                        className={`flex items-center gap-1.5 text-xs ${
                          isPast ? "text-muted-foreground/60" : "text-muted-foreground"
                        }`}
                      >
                        <IconPill icon={LocationIcon} size="sm" className={isPast || isCancelled ? "opacity-60" : ""} />
                        <span className="truncate">{locationLabel}</span>
                      </div>
                    )}
                    {attendeeStack && (
                      <div className={isPast ? "opacity-60" : ""}>{attendeeStack}</div>
                    )}
                  </div>

                  {/* === DESKTOP — rendu #598 (hidden sm:block) === */}
                  <div className="hidden space-y-1.5 sm:block">
                    <div
                      className={`flex items-center gap-3 text-xs ${
                        isPast ? "text-muted-foreground/60" : "text-muted-foreground"
                      }`}
                    >
                      <span className="flex shrink-0 items-center gap-1.5">
                        <IconPill icon={Clock} size="sm" className={isPast || isCancelled ? "opacity-60" : ""} />
                        <span suppressHydrationWarning>{timeStr}</span>
                      </span>
                      {locationLabel && (
                        <span className="flex min-w-0 items-center gap-1.5">
                          <IconPill icon={LocationIcon} size="sm" className={isPast || isCancelled ? "opacity-60" : ""} />
                          <span className="truncate">{locationLabel}</span>
                        </span>
                      )}
                    </div>

                    <p
                      className={`line-clamp-2 font-semibold leading-snug ${
                        isCancelled
                          ? "text-muted-foreground line-through"
                          : isPast
                            ? "text-muted-foreground"
                            : ""
                      }`}
                    >
                      {momentData.title}
                    </p>

                    {attendeeStack && <div className={isPast ? "opacity-60" : ""}>{attendeeStack}</div>}

                    <div className="flex items-center gap-2">
                      <CirclePill name={momentData.circleName} withIcon muted={isPast || isCancelled} />
                      {!isPast && isDraft && <DraftBadge label={tMoment("status.draft")} />}
                      {pendingApprovalBadge}
                      {waitlistedBadge}
                    </div>
                  </div>
                </div>

                {momentData.coverImage ? (
                  <Image
                    src={momentData.coverImage}
                    alt={momentData.title}
                    width={100}
                    height={100}
                    className={`size-[80px] shrink-0 rounded-xl sm:size-[100px] ${COVER_IMAGE_BG} object-cover ${isPast || isCancelled ? "opacity-40 grayscale" : ""}`}
                  />
                ) : (
                  <div
                    className={`size-[80px] shrink-0 rounded-xl sm:size-[100px] ${isPast || isCancelled ? "opacity-40 grayscale" : ""}`}
                    style={{ background: gradient }}
                  />
                )}
              </div>
            </div>
          </div>
        </Link>
    </TimelineScaffold>
  );
}
