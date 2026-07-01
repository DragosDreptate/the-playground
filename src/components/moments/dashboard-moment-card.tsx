"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DraftBadge } from "@/components/badges/draft-badge";
import { MapPin, Globe, Clock } from "lucide-react";
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
        locationType: props.moment.locationType,
        locationName: props.moment.locationName,
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
        locationType: props.registration.moment.locationType,
        locationName: props.registration.moment.locationName,
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
    isPast,
    isDraft,
    isAmber: isWaitlisted || isPendingApproval,
    // Actif : rose pour le Host/inscrit, neutre pour une inscription inactive.
    defaultClass: isOrganizerView || isOrganizer || isRegistered ? "bg-primary" : "bg-border",
  });

  const cardBorderClass = isDraft
    ? "border-dashed border-muted-foreground/30 opacity-70"
    : "border-border";

  const gradient = getMomentGradient(momentData.title);
  const { weekday, dateStr } = formatWeekdayAndDate(momentData.startsAt, locale);
  const dateStrShort = formatDayMonthShort(momentData.startsAt, locale);
  const timeStr = formatTime(momentData.startsAt);

  const locationLabel =
    momentData.locationType === "ONLINE"
      ? t("online")
      : momentData.locationType === "HYBRID"
        ? t("hybrid")
        : momentData.locationName;

  const waitlistedBadge = !isPast && !isDraft && isWaitlisted ? (
    <StatusPill {...REGISTRATION_PILL.waitlisted} label={t("registrationStatus.waitlisted")} hideLabelOnMobile />
  ) : null;

  const pendingApprovalBadge = !isPast && !isDraft && isPendingApproval ? (
    <StatusPill {...REGISTRATION_PILL.pendingApproval} label={t("registrationStatus.pending_approval")} hideLabelOnMobile />
  ) : null;

  // Badge Organisateur (mobile) : seul badge de statut affiché sur Mon espace, pour
  // distinguer les événements que j'organise de mes simples inscriptions.
  const organizerBadge = isOrganizerView || isOrganizer ? (
    <StatusPill {...REGISTRATION_PILL.host} label={t("role.host")} hideLabelOnMobile />
  ) : null;

  const attendeeStack =
    momentData.registrationCount > 0 ? (
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
            className={`bg-card flex flex-col gap-2 rounded-xl border p-3 shadow-lg dark:shadow-none sm:flex-row sm:items-center sm:gap-3 ${CARD_HOVER_GROUP} ${cardBorderClass}`}
          >
            {/* Titre — pleine largeur au-dessus, une ligne (mobile uniquement) */}
            <p
              className={`truncate text-base font-semibold leading-snug sm:hidden ${
                isPast ? "text-muted-foreground" : ""
              }`}
            >
              {momentData.title}
            </p>

            {/* Rangée infos | cover. En desktop, `contents` dissout ce wrapper (layout #598). */}
            <div className="flex items-start gap-3 sm:contents">
              <div className="min-w-0 flex-1">
                {/* === MOBILE — body identique aux cartes Explorer (sm:hidden) === */}
                <div className="space-y-[7px] sm:hidden">
                  <CirclePill name={momentData.circleName} withIcon muted={isPast} />
                  {locationLabel && (
                    <div
                      className={`flex items-center gap-1.5 text-xs ${
                        isPast ? "text-muted-foreground/60" : "text-muted-foreground"
                      }`}
                    >
                      <IconPill icon={LocationIcon} size="sm" className={isPast ? "opacity-60" : ""} />
                      <span className="truncate">{locationLabel}</span>
                    </div>
                  )}
                  {(attendeeStack || organizerBadge) && (
                    <div className="flex items-center gap-2">
                      {attendeeStack && <div className={isPast ? "opacity-60" : ""}>{attendeeStack}</div>}
                      {organizerBadge}
                    </div>
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
                      <IconPill icon={Clock} size="sm" className={isPast ? "opacity-60" : ""} />
                      <span suppressHydrationWarning>{timeStr}</span>
                    </span>
                    {locationLabel && (
                      <span className="flex min-w-0 items-center gap-1.5">
                        <IconPill icon={LocationIcon} size="sm" className={isPast ? "opacity-60" : ""} />
                        <span className="truncate">{locationLabel}</span>
                      </span>
                    )}
                  </div>

                  <p
                    className={`line-clamp-2 font-semibold leading-snug ${
                      isPast ? "text-muted-foreground" : ""
                    }`}
                  >
                    {momentData.title}
                  </p>

                  {attendeeStack && <div className={isPast ? "opacity-60" : ""}>{attendeeStack}</div>}

                  <div className="flex items-center gap-2">
                    <CirclePill name={momentData.circleName} withIcon muted={isPast} />
                    <div className="flex items-center gap-2">
                      {!isPast && isDraft && <DraftBadge label={tMoment("status.draft")} />}
                      {pendingApprovalBadge}
                      {waitlistedBadge}
                    </div>
                  </div>
                </div>
              </div>

              {momentData.coverImage ? (
                <Image
                  src={momentData.coverImage}
                  alt={momentData.title}
                  width={100}
                  height={100}
                  className={`size-[80px] shrink-0 rounded-xl sm:size-[100px] ${COVER_IMAGE_BG} object-cover ${isPast ? "opacity-40 grayscale" : ""}`}
                />
              ) : (
                <div
                  className={`size-[80px] shrink-0 rounded-xl sm:size-[100px] ${isPast ? "opacity-40 grayscale" : ""}`}
                  style={{ background: gradient }}
                />
              )}
            </div>
          </div>
        </Link>
    </TimelineScaffold>
  );
}
