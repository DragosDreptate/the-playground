"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DraftBadge } from "@/components/badges/draft-badge";
import { MapPin, Globe, Clock } from "lucide-react";
import { CARD_HOVER_GROUP, IconPill, CirclePill, StatusPill, TimelineScaffold, REGISTRATION_PILL, momentDotClass } from "@/components/cards/card-primitives";
import { AttendeeAvatarStack } from "@/components/moments/attendee-avatar-stack";
import { getMomentGradient, COVER_IMAGE_BG } from "@/lib/gradient";
import { formatWeekdayAndDate, formatTime } from "@/lib/format-date";

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

  const [isToday, setIsToday] = useState(false);
  useEffect(() => {
    const now = new Date();
    setIsToday(momentData.startsAt.toDateString() === now.toDateString());
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
    : isPast
      ? "border-border"
      : "border-border";

  const gradient = getMomentGradient(momentData.title);
  const { weekday, dateStr } = formatWeekdayAndDate(momentData.startsAt, locale);
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

  const LocationIcon = momentData.locationType === "IN_PERSON" ? MapPin : Globe;

  return (
    <TimelineScaffold
      dotClass={dotClass}
      isLast={isLast}
      dateColumn={
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
            className={`bg-card flex items-center gap-3 rounded-xl border p-3 shadow-lg dark:shadow-none ${CARD_HOVER_GROUP} ${cardBorderClass}`}
          >
            <div className="min-w-0 flex-1 space-y-1.5">
              <div
                className={`hidden items-center gap-3 text-xs sm:flex ${
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

              {momentData.registrationCount > 0 && (
                <div className={isPast ? "opacity-60" : ""}>
                  <AttendeeAvatarStack
                    attendees={momentData.topAttendees}
                    totalCount={momentData.registrationCount}
                    label={
                      momentData.topAttendees.length < momentData.registrationCount
                        ? tMoment("registrations.moreRegistered", { count: momentData.registrationCount - momentData.topAttendees.length })
                        : tMoment("registrations.registered", { count: momentData.registrationCount })
                    }
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <CirclePill name={momentData.circleName} withIcon muted={isPast} />
                <div className="hidden items-center gap-2 sm:flex">
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
                className={`size-[100px] shrink-0 rounded-xl ${COVER_IMAGE_BG} object-cover ${isPast ? "opacity-40 grayscale" : ""}`}
              />
            ) : (
              <div
                className={`size-[100px] shrink-0 rounded-xl ${isPast ? "opacity-40 grayscale" : ""}`}
                style={{ background: gradient }}
              />
            )}
          </div>
        </Link>
    </TimelineScaffold>
  );
}
