import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { getMomentGradient } from "@/lib/gradient";
import { MapPin, Globe, Users } from "lucide-react";
import type { PublicMoment } from "@/domain/ports/repositories/moment-repository";

type Props = {
  moment: PublicMoment;
};

export async function PublicMomentCard({ moment }: Props) {
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

  return (
    <Link href={`/m/${moment.slug}`} className="group block">
      <div className="bg-card flex flex-col gap-3 rounded-2xl border p-5 transition-colors hover:border-primary/30">
        {/* Circle name (prominent) + category badge */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-muted-foreground truncate text-sm font-medium">
            {moment.circle.name}
            {moment.circle.city && (
              <span className="text-muted-foreground/70"> · {moment.circle.city}</span>
            )}
          </p>
          {moment.circle.category && (
            <Badge variant="secondary" className="shrink-0 text-xs">
              {tCategory(moment.circle.category)}
            </Badge>
          )}
        </div>

        {/* Thumbnail + content */}
        <div className="flex items-start gap-4">
          {/* Thumbnail gradient */}
          <div
            className="size-[72px] shrink-0 rounded-xl"
            style={{ background: gradient }}
          />

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
