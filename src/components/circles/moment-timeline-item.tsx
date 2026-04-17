import Image from "next/image";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getMomentGradient } from "@/lib/gradient";
import { formatWeekdayAndDate, formatTime, isSameDayInParis } from "@/lib/format-date";
import { MapPin, Globe, Users, Check, Clock, XCircle, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  isOrganizer: boolean;
  isLast: boolean;
  /** "dashboard" (défaut) → lien vers le dashboard Host.
   *  "public" → lien vers /m/[slug], sans badges de statut utilisateur. */
  variant?: "dashboard" | "public";
  /** Premiers inscrits pour l'avatar stack (variant public). */
  topAttendees?: Attendee[];
};

export async function MomentTimelineItem({
  moment,
  circleSlug,
  registrationCount,
  userRegistrationStatus,
  isOrganizer,
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

  const dotClass = isCancelled
    ? "bg-destructive/50"
    : isPast
      ? "bg-border"
      : isDraft
        ? "bg-muted-foreground/40"
        : isWaitlisted
          ? "bg-amber-400"
          : "bg-primary";

  const cardBorderClass = isCancelled
    ? "border-destructive/20"
    : isDraft
      ? "border-dashed border-muted-foreground/30 opacity-70"
      : isPast
        ? "border-border"
        : "border-border hover:border-primary/30";

  const gradient = getMomentGradient(moment.title);
  const now = new Date();
  const isToday = isSameDayInParis(moment.startsAt, now);
  const { weekday, dateStr } = formatWeekdayAndDate(moment.startsAt, locale);
  const timeStr = formatTime(moment.startsAt);

  const locationLabel =
    moment.locationType === "ONLINE"
      ? t("form.locationOnline")
      : moment.locationType === "HYBRID"
        ? t("form.locationHybrid")
        : moment.locationName ?? moment.locationAddress ?? null;

  const LocationIcon = moment.locationType === "IN_PERSON" ? MapPin : Globe;

  return (
    <div className="flex gap-0">
      {/* Date column */}
      <div className="w-[72px] shrink-0 pr-2 pt-1 text-right sm:w-[100px] sm:pr-4">
        {isToday ? (
          <span className="inline-block rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
            {tCircle("detail.today")}
          </span>
        ) : (
          <>
            <p className="text-muted-foreground text-xs">{weekday}</p>
            <p className="text-sm font-medium leading-snug">{dateStr}</p>
          </>
        )}
      </div>

      {/* Dot + vertical line */}
      <div className="flex shrink-0 flex-col items-center">
        <div className={`mt-2 size-2 shrink-0 rounded-full ${dotClass}`} />
        {!isLast && (
          <div className="mt-2 flex-1 border-l border-dashed border-border" />
        )}
      </div>

      {/* Card */}
      <div className={`min-w-0 flex-1 pl-2 sm:pl-4 ${isLast ? "pb-0" : "pb-8"}`}>
        <Link
          href={variant === "public" ? `/m/${moment.slug}` : `/dashboard/circles/${circleSlug}/moments/${moment.slug}`}
          className="group block"
        >
          <div className={`bg-card flex flex-col rounded-xl border transition-colors ${cardBorderClass}`}>
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
            <div className="flex items-center gap-4 p-4">
              {/* Content */}
              <div className="min-w-0 flex-1 space-y-1.5">
                {/* Time + badge rôle — sur la même ligne */}
                <div className="flex items-center gap-2">
                  <p className={`text-xs ${isPast ? "text-muted-foreground/60" : "text-muted-foreground"}`}>{timeStr}</p>
                  {!isCancelled && variant === "dashboard" && (
                    <>
                      {isDraft ? (
                        <DraftBadge label={t("status.draft")} />
                      ) : isOrganizer ? (
                        <Badge variant="outline" className="shrink-0 gap-1 border-primary/40 text-xs text-primary">
                          <Crown className="size-3" />
                          <span className="hidden sm:inline">{tDashboard("role.host")}</span>
                        </Badge>
                      ) : isRegistered ? (
                        <Badge variant="outline" className="shrink-0 gap-1 border-primary/40 text-xs text-primary">
                          <Check className="size-3" />
                          <span className="hidden sm:inline">{tDashboard("registrationStatus.registered")}</span>
                        </Badge>
                      ) : isWaitlisted ? (
                        <Badge variant="secondary" className="shrink-0 gap-1 text-xs">
                          <Clock className="size-3" />
                          <span className="hidden sm:inline">{tDashboard("registrationStatus.waitlisted")}</span>
                        </Badge>
                      ) : null}
                    </>
                  )}
                </div>

                {/* Title */}
                {!isCancelled && variant === "dashboard" ? (
                  <p className={`truncate font-semibold leading-snug ${isPast ? "text-muted-foreground" : "group-hover:underline"}`}>
                    {moment.title}
                  </p>
                ) : (
                  <p className={`truncate font-semibold leading-snug ${isCancelled ? "text-muted-foreground line-through" : isPast ? "text-muted-foreground" : "group-hover:underline"}`}>
                    {moment.title}
                  </p>
                )}

                {/* Inscrits */}
                {!isCancelled && registrationCount > 0 && variant === "dashboard" && (
                  <div className={`flex items-center gap-1 text-xs ${isPast ? "text-muted-foreground/60" : "text-muted-foreground"}`}>
                    <Users className="size-3 shrink-0" />
                    <span>{t("registrations.registered", { count: registrationCount })}</span>
                  </div>
                )}
                {!isCancelled && registrationCount > 0 && variant === "public" && (
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

                {/* Location */}
                {locationLabel && (
                  <div className={`flex items-center gap-1.5 text-xs ${isPast ? "text-muted-foreground/60" : "text-muted-foreground"}`}>
                    <LocationIcon className="size-3.5 shrink-0" />
                    <span className="truncate">{locationLabel}</span>
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
                  className={`size-[100px] shrink-0 rounded-lg object-cover ${isCancelled || isPast ? "grayscale opacity-40" : ""}`}
                />
              ) : (
                <div
                  className={`size-[100px] shrink-0 rounded-lg ${isCancelled || isPast ? "grayscale opacity-40" : ""}`}
                  style={{ background: gradient }}
                />
              )}
            </div>
          </div>
        </Link>

      </div>
    </div>
  );
}
