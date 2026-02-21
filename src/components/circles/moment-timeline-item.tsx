import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getMomentGradient } from "@/lib/gradient";
import { MapPin, Globe, Users, ArrowRight, Check, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Moment } from "@/domain/models/moment";
import type { RegistrationStatus } from "@/domain/models/registration";

type Props = {
  moment: Moment;
  circleSlug: string;
  registrationCount: number;
  userRegistrationStatus: RegistrationStatus | null;
  isHost: boolean;
  isLast: boolean;
};

function formatTimelineDate(date: Date): { weekday: string; dateStr: string; isToday: boolean } {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const weekday = date.toLocaleDateString(undefined, { weekday: "short" });
  const dateStr = date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

  return { weekday, dateStr, isToday };
}

export async function MomentTimelineItem({
  moment,
  circleSlug,
  registrationCount,
  userRegistrationStatus,
  isHost,
  isLast,
}: Props) {
  const t = await getTranslations("Moment");
  const tCircle = await getTranslations("Circle");
  const tDashboard = await getTranslations("Dashboard");

  const isCancelled = moment.status === "CANCELLED";

  const isRegistered =
    userRegistrationStatus === "REGISTERED" ||
    userRegistrationStatus === "CHECKED_IN";
  const isWaitlisted = userRegistrationStatus === "WAITLISTED";

  const dotClass = isCancelled
    ? "bg-destructive/50"
    : isRegistered
      ? "bg-primary"
      : isWaitlisted
        ? "bg-amber-400"
        : "bg-border";

  const gradient = getMomentGradient(moment.title);
  const { weekday, dateStr, isToday } = formatTimelineDate(moment.startsAt);

  const timeStr = moment.startsAt.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

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
      <div className="w-[100px] shrink-0 pr-4 pt-1 text-right">
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
      <div className={`min-w-0 flex-1 pl-4 ${isLast ? "pb-0" : "pb-8"}`}>
        <Link
          href={`/dashboard/circles/${circleSlug}/moments/${moment.slug}`}
          className="group block"
        >
          <div className={`bg-card flex flex-col rounded-xl border transition-colors ${isCancelled ? "border-destructive/20" : "border-border hover:border-primary/30"}`}>
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
            <div className="flex items-start gap-4 p-4">
              {/* Content */}
              <div className="min-w-0 flex-1 space-y-1">
                {/* Time */}
                <p className="text-muted-foreground text-xs">{timeStr}</p>

                {/* Title */}
                <p className={`truncate font-semibold leading-snug ${isCancelled ? "text-muted-foreground line-through" : "group-hover:underline"}`}>
                  {moment.title}
                </p>

                {/* Location */}
                {locationLabel && (
                  <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <LocationIcon className="size-3.5 shrink-0" />
                    <span className="truncate">{locationLabel}</span>
                  </div>
                )}

                {/* Inscriptions + statut */}
                {!isCancelled && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {registrationCount > 0 && (
                      <div className="text-muted-foreground flex items-center gap-1 text-xs">
                        <Users className="size-3.5 shrink-0" />
                        <span>
                          {t("registrations.registered", { count: registrationCount })}
                        </span>
                      </div>
                    )}

                    {isRegistered && (
                      <Badge variant="default" className="gap-1 text-xs">
                        <Check className="size-3" />
                        {tDashboard("registrationStatus.registered")}
                      </Badge>
                    )}

                    {isWaitlisted && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Clock className="size-3" />
                        {tDashboard("registrationStatus.waitlisted")}
                      </Badge>
                    )}

                    {moment.status === "PAST" && (
                      <Badge variant="outline" className="text-xs">
                        {t("status.past")}
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Thumbnail */}
              <div
                className={`size-[60px] shrink-0 rounded-lg ${isCancelled ? "grayscale opacity-40" : ""}`}
                style={{ background: gradient }}
              />
            </div>
          </div>
        </Link>

        {/* Manage button — Host only, outside the card link */}
        {isHost && (
          <Link
            href={`/dashboard/circles/${circleSlug}/moments/${moment.slug}`}
            className="text-muted-foreground hover:text-foreground mt-2 inline-flex items-center gap-1 text-xs transition-colors"
          >
            {tCircle("detail.manageMoment")}
            <ArrowRight className="size-3" />
          </Link>
        )}
      </div>
    </div>
  );
}
