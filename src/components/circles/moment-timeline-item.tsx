import Image from "next/image";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getMomentGradient, COVER_IMAGE_BG } from "@/lib/gradient";
import { formatWeekdayAndDate, formatDayMonthShort, formatTime, isSameDayInParis } from "@/lib/format-date";
import { MapPin, Globe, Clock, XCircle } from "lucide-react";
import { CARD_HOVER_GROUP, IconPill, StatusPill, TimelineScaffold, REGISTRATION_PILL, momentDotClass } from "@/components/cards/card-primitives";
import { DraftBadge } from "@/components/badges/draft-badge";
import { AttendeeAvatarStack } from "@/components/moments/attendee-avatar-stack";
import type { Attendee } from "@/components/moments/attendee-avatar-stack";
import type { Moment } from "@/domain/models/moment";
import type { RegistrationStatus } from "@/domain/models/registration";

type Props = {
  moment: Moment;
  circleSlug: string;
  registrationCount: number;
  userRegistrationStatus: RegistrationStatus | null;
  isLast: boolean;
  /** "dashboard" (défaut) → lien vers le dashboard Host.
   *  "public" → lien vers /m/[slug], sans badges de statut utilisateur. */
  variant?: "dashboard" | "public";
  /** Premiers inscrits pour l'avatar stack. */
  topAttendees?: Attendee[];
};

export async function MomentTimelineItem({
  moment,
  circleSlug,
  registrationCount,
  userRegistrationStatus,
  isLast,
  variant = "dashboard",
  topAttendees = [],
}: Props) {
  const t = await getTranslations("Moment");
  const tCircle = await getTranslations("Circle");
  const tDashboard = await getTranslations("Dashboard");
  const locale = await getLocale();

  const isCancelled = moment.status === "CANCELLED";
  const isPast = moment.status === "PAST";
  const isDraft = moment.status === "DRAFT";

  const isRegistered =
    userRegistrationStatus === "REGISTERED" ||
    userRegistrationStatus === "CHECKED_IN";
  const isWaitlisted = userRegistrationStatus === "WAITLISTED";
  const isPendingApproval = userRegistrationStatus === "PENDING_APPROVAL";

  const dotClass = momentDotClass({
    isCancelled,
    isPast,
    isDraft,
    isAmber: isWaitlisted || isPendingApproval,
  });

  const cardBorderClass = isCancelled
    ? "border-destructive/20"
    : isDraft
      ? "border-dashed border-muted-foreground/30 opacity-70"
      : "border-border";

  const gradient = getMomentGradient(moment.title);
  const now = new Date();
  const isToday = isSameDayInParis(moment.startsAt, now);
  const { weekday, dateStr } = formatWeekdayAndDate(moment.startsAt, locale);
  const dateStrShort = formatDayMonthShort(moment.startsAt, locale);
  const timeStr = formatTime(moment.startsAt);

  const locationLabel =
    moment.locationType === "ONLINE"
      ? t("form.locationOnline")
      : moment.locationType === "HYBRID"
        ? t("form.locationHybrid")
        : moment.locationName ?? moment.locationAddress ?? null;

  const LocationIcon = moment.locationType === "IN_PERSON" ? MapPin : Globe;

  const statusBadge =
    isCancelled || variant !== "dashboard"
      ? null
      : isDraft
        ? <DraftBadge label={t("status.draft")} showLabelOnMobile />
        : isRegistered
          ? <StatusPill {...REGISTRATION_PILL.registered} label={tDashboard("registrationStatus.registered")} hideLabelOnMobile />
          : isPendingApproval
            ? <StatusPill {...REGISTRATION_PILL.pendingApproval} label={tDashboard("registrationStatus.pending_approval")} hideLabelOnMobile />
            : isWaitlisted
              ? <StatusPill {...REGISTRATION_PILL.waitlisted} label={tDashboard("registrationStatus.waitlisted")} hideLabelOnMobile />
              : null;

  return (
    <TimelineScaffold
      dotClass={dotClass}
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
              <p className="text-muted-foreground text-xs">{weekday}</p>
              <p className="text-sm font-medium leading-snug">
                <span className="sm:hidden">{dateStrShort}</span>
                <span className="hidden sm:inline">{dateStr}</span>
              </p>
            </>
          )}
          <p className={`mt-0.5 text-xs sm:hidden ${isPast ? "text-muted-foreground/60" : "text-muted-foreground"}`}>
            {timeStr}
          </p>
        </div>
      }
    >
      <Link
          href={variant === "public" ? `/m/${moment.slug}` : `/dashboard/circles/${circleSlug}/moments/${moment.slug}`}
          className="block"
        >
          <div className={`bg-card flex flex-col rounded-xl border shadow-lg dark:shadow-none ${CARD_HOVER_GROUP} ${cardBorderClass}`}>
            {/* Bandeau annulation */}
            {isCancelled && (
              <div className="flex items-center gap-2 rounded-t-xl border-b border-destructive/20 bg-destructive/10 px-4 py-2">
                <XCircle className="size-3.5 shrink-0 text-destructive" />
                <span className="text-destructive text-xs font-medium">
                  {t("public.eventCancelled")}
                </span>
              </div>
            )}

            {/* Corps de la carte */}
            <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
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
                {moment.title}
              </p>

              {/* Rangée content | cover. En desktop, `contents` dissout ce wrapper (layout #598). */}
              <div className="flex items-start gap-4 sm:contents">
                {/* Content */}
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                {/* Mobile : description (1 ligne), avant le lieu */}
                {moment.description && (
                  <p
                    className={`line-clamp-2 text-xs sm:hidden ${
                      isPast || isCancelled ? "text-muted-foreground/60" : "text-muted-foreground"
                    }`}
                  >
                    {moment.description}
                  </p>
                )}
                {/* Mobile : lieu inline (l'heure est dans la colonne date) */}
                {locationLabel && (
                  <div
                    className={`flex items-center gap-1.5 text-xs sm:hidden ${
                      isPast ? "text-muted-foreground/60" : "text-muted-foreground"
                    }`}
                  >
                    <IconPill icon={LocationIcon} size="sm" className={isPast || isCancelled ? "opacity-60" : ""} />
                    <span className="truncate">{locationLabel}</span>
                  </div>
                )}

                {/* Desktop : heure + lieu en pastilles sur une ligne */}
                <div
                  className={`hidden items-center gap-3 text-xs sm:flex ${
                    isPast ? "text-muted-foreground/60" : "text-muted-foreground"
                  }`}
                >
                  <span className="flex shrink-0 items-center gap-1.5">
                    <IconPill icon={Clock} size="sm" className={isPast || isCancelled ? "opacity-60" : ""} />
                    {timeStr}
                  </span>
                  {locationLabel && (
                    <span className="flex min-w-0 items-center gap-1.5">
                      <IconPill icon={LocationIcon} size="sm" className={isPast || isCancelled ? "opacity-60" : ""} />
                      <span className="truncate">{locationLabel}</span>
                    </span>
                  )}
                </div>


                <p
                  className={`hidden font-semibold leading-snug sm:line-clamp-2 ${
                    isCancelled
                      ? "text-muted-foreground line-through"
                      : isPast
                        ? "text-muted-foreground"
                        : ""
                  }`}
                >
                  {moment.title}
                </p>

                {((!isCancelled && registrationCount > 0) || statusBadge) && (
                  <div className="flex items-center gap-2">
                    {!isCancelled && registrationCount > 0 && (
                      <div className={isPast ? "opacity-60" : ""}>
                        <AttendeeAvatarStack
                          attendees={topAttendees}
                          totalCount={registrationCount}
                          label={
                            topAttendees.length < registrationCount
                              ? t("registrations.moreRegistered", { count: registrationCount - topAttendees.length })
                              : t("registrations.registered", { count: registrationCount })
                          }
                        />
                      </div>
                    )}
                    {statusBadge}
                  </div>
                )}
              </div>

              {/* Thumbnail */}
              {moment.coverImage ? (
                <Image
                  src={moment.coverImage}
                  alt={moment.title}
                  width={100}
                  height={100}
                  className={`size-[80px] shrink-0 rounded-lg sm:size-[100px] object-cover ${COVER_IMAGE_BG} ${isCancelled || isPast ? "grayscale opacity-40" : ""}`}
                />
              ) : (
                <div
                  className={`size-[80px] shrink-0 rounded-lg sm:size-[100px] ${isCancelled || isPast ? "grayscale opacity-40" : ""}`}
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
