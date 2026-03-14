import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { getMomentGradient } from "@/lib/gradient";
import { formatDayMonth, formatTime } from "@/lib/format-date";
import { Users, CalendarIcon, MapPin } from "lucide-react";
import type { DashboardCircle } from "@/domain/models/circle";

type Props = {
  circle: DashboardCircle;
};

export async function DashboardCircleCard({ circle }: Props) {
  const [t, tCategory, locale] = await Promise.all([
    getTranslations("Explorer"),
    getTranslations("CircleCategory"),
    getLocale(),
  ]);

  const gradient = getMomentGradient(circle.name);

  const nextMomentStart = circle.nextMoment?.startsAt ?? null;
  const nextMomentDate = nextMomentStart ? formatDayMonth(nextMomentStart, locale) : null;
  const nextMomentTime = nextMomentStart ? formatTime(nextMomentStart) : null;
  const hasNextMoment = !!(circle.nextMoment && nextMomentDate);

  const categoryLabel =
    circle.category === "OTHER" && circle.customCategory
      ? circle.customCategory
      : circle.category
        ? tCategory(circle.category)
        : null;

  return (
    <Link href={`/dashboard/circles/${circle.slug}`} className="group block min-w-0">
      <div className="bg-card overflow-hidden rounded-2xl border p-3 sm:p-4 transition-colors hover:border-primary/30">
        <div className="flex items-center gap-3 sm:gap-4">

          {/* Thumbnail */}
          <div
            className="size-[90px] shrink-0 overflow-hidden rounded-xl"
            style={circle.coverImage ? undefined : { background: gradient }}
          >
            {circle.coverImage && (
              <Image
                src={circle.coverImage}
                alt={circle.name}
                width={90}
                height={90}
                className="size-full object-cover"
                sizes="90px"
              />
            )}
          </div>

          {/* Body */}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {categoryLabel && (
                <span className="text-muted-foreground text-xs">{categoryLabel}</span>
              )}
              <span className="inline-flex items-center rounded border border-primary/40 px-1.5 py-0.5 text-xs font-medium text-primary">
                {circle.memberRole === "HOST"
                  ? t("circleCard.roleBadge.host")
                  : t("circleCard.roleBadge.member")}
              </span>
            </div>
            <h3 className="text-sm font-semibold leading-snug group-hover:underline truncate">
              {circle.name}
            </h3>
            <p className="text-muted-foreground line-clamp-1 text-xs">
              {circle.description}
            </p>
            <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
              {circle.city && (
                <div className="flex items-center gap-1">
                  <MapPin className="size-3.5 shrink-0" />
                  <span>{circle.city}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Users className="size-3.5 shrink-0" />
                <span>{t("circleCard.members", { count: circle.memberCount })}</span>
              </div>
              {circle.upcomingMomentCount > 0 && (
                <div className="flex items-center gap-1">
                  <CalendarIcon className="size-3.5 shrink-0" />
                  <span>{t("circleCard.upcomingMoments", { count: circle.upcomingMomentCount })}</span>
                </div>
              )}
            </div>
            {/* Prochain événement — mobile uniquement */}
            {hasNextMoment && (
              <div className="rounded-lg border border-border bg-muted/40 px-2 py-1.5 sm:hidden">
                <p className="truncate text-xs font-medium">{circle.nextMoment!.title}</p>
              </div>
            )}
          </div>

          {/* Colonne droite — desktop uniquement */}
          <div className="hidden sm:flex shrink-0 items-center ml-4">
            {hasNextMoment ? (
              <div className="flex flex-col gap-1 rounded-xl border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground max-w-[200px]">
                <p className="truncate font-medium text-foreground">{circle.nextMoment!.title}</p>
                <div className="flex items-center gap-1.5">
                  <CalendarIcon className="size-3 shrink-0 text-primary" />
                  <span className="whitespace-nowrap">{nextMomentDate} · {nextMomentTime}</span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                {t("circleCard.noUpcomingMoments")}
              </div>
            )}
          </div>

        </div>
      </div>
    </Link>
  );
}
