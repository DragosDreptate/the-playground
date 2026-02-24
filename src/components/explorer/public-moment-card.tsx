import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { getMomentGradient } from "@/lib/gradient";
import { MapPin, Globe, Users, Crown, Clock } from "lucide-react";
import type { PublicMoment } from "@/domain/ports/repositories/moment-repository";
import type { RegistrationStatus } from "@/domain/models/registration";

type Props = {
  moment: PublicMoment;
  registrationStatus?: RegistrationStatus | null;
  isOrganizer?: boolean;
};

export async function PublicMomentCard({ moment, registrationStatus, isOrganizer }: Props) {
  const t = await getTranslations("Explorer");
  const tCategory = await getTranslations("CircleCategory");

  const gradient = getMomentGradient(moment.title);

  const dateStr = moment.startsAt.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const timeStr = moment.startsAt.toLocaleTimeString(undefined, {
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

  const roleBadge = isOrganizer ? (
    <span className="inline-flex shrink-0 items-center gap-1 rounded border border-primary/40 px-1.5 py-0.5 text-xs font-medium text-primary">
      <Crown className="size-3" aria-hidden="true" />
      {t("momentCard.roleBadge.host")}
    </span>
  ) : registrationStatus === "REGISTERED" || registrationStatus === "CHECKED_IN" ? (
    <span className="inline-flex shrink-0 items-center gap-1 rounded border border-primary/40 px-1.5 py-0.5 text-xs font-medium text-primary">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      {t("momentCard.roleBadge.registered")}
    </span>
  ) : registrationStatus === "WAITLISTED" ? (
    <span className="inline-flex shrink-0 items-center gap-1 rounded border border-primary/40 px-1.5 py-0.5 text-xs font-medium text-primary">
      <Clock className="size-3" aria-hidden="true" />
      {t("momentCard.roleBadge.waitlisted")}
    </span>
  ) : null;

  return (
    <Link href={`/m/${moment.slug}`} className="group block min-w-0">
      <div className="bg-card flex flex-col gap-3 overflow-hidden rounded-2xl border p-4 transition-colors hover:border-primary/30 sm:p-5">
        {/* Circle name (prominent) + category badge + role badge */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-muted-foreground truncate text-sm font-medium">
            {moment.circle.name}
            {moment.circle.city && (
              <span className="text-muted-foreground/70"> · {moment.circle.city}</span>
            )}
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            {moment.circle.category && (
              <Badge variant="secondary" className="text-xs">
                {tCategory(moment.circle.category)}
              </Badge>
            )}
            {roleBadge}
          </div>
        </div>

        {/* Thumbnail + content */}
        <div className="flex items-start gap-4">
          {/* Thumbnail */}
          {moment.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={moment.coverImage}
              alt={moment.title}
              className="size-[72px] shrink-0 rounded-xl object-cover"
            />
          ) : (
            <div
              className="size-[72px] shrink-0 rounded-xl"
              style={{ background: gradient }}
            />
          )}

          {/* Details */}
          <div className="min-w-0 flex-1 space-y-1">
            {/* Title */}
            <p className="font-semibold leading-snug group-hover:underline">
              {moment.title}
            </p>

            {/* Date + time */}
            <p className="text-muted-foreground text-sm">
              {dateStr} · {timeStr}
            </p>

            {/* Location */}
            {locationLabel && (
              <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <LocationIcon className="size-3.5 shrink-0" />
                <span className="truncate">{locationLabel}</span>
              </div>
            )}

            {/* Registrations / capacity */}
            <div className="text-muted-foreground flex items-center gap-1 pt-0.5 text-xs">
              <Users className="size-3.5 shrink-0" />
              {spotsRemaining !== null && spotsRemaining > 0 ? (
                <span>{t("momentCard.spotsRemaining", { count: spotsRemaining })}</span>
              ) : (
                <span>{t("momentCard.registeredCount", { count: moment.registrationCount })}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
