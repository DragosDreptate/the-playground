import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { getMomentGradient } from "@/lib/gradient";
import { formatDayMonth, formatTime } from "@/lib/format-date";
import { CalendarIcon, MapPin, Clock } from "lucide-react";
import { AttendeeAvatarStack } from "@/components/moments/attendee-avatar-stack";
import { Badge } from "@/components/ui/badge";
import { CategoryBadge } from "@/components/badges/category-badge";
import type { DashboardCircle } from "@/domain/models/circle";
import { resolveCategoryLabel } from "@/lib/circle-category-helpers";

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

  const categoryLabel = resolveCategoryLabel(circle.category, circle.customCategory, tCategory);

  return (
    <Link href={circle.membershipStatus === "PENDING" ? `/circles/${circle.slug}` : `/dashboard/circles/${circle.slug}`} className="group block min-w-0">
      <div className="bg-card overflow-hidden rounded-2xl border p-3 sm:p-4 shadow-lg dark:shadow-none transition-colors hover:border-primary/30">
        <div className="flex items-center gap-4 sm:gap-5">

          {/* Thumbnail */}
          <div
            className="size-[100px] shrink-0 overflow-hidden rounded-xl"
            style={circle.coverImage ? undefined : { background: gradient }}
          >
            {circle.coverImage && (
              <Image
                src={circle.coverImage}
                alt={circle.name}
                width={100}
                height={100}
                className="size-full object-cover"
                sizes="100px"
              />
            )}
          </div>

          {/* Body */}
          <div className="min-w-0 flex-1 space-y-[5px] sm:space-y-1.5">
            {/* Badges — catégorie */}
            {categoryLabel && (
              <div className="flex items-center gap-2">
                <CategoryBadge label={categoryLabel} />
              </div>
            )}
            {/* Titre — pleine largeur */}
            <h3 className="truncate text-sm font-semibold leading-snug group-hover:text-primary dark:group-hover:text-[oklch(0.76_0.27_341)] transition-colors">
              {circle.name}
            </h3>
            {circle.city && (
              <div className="text-muted-foreground flex items-center gap-1 text-xs">
                <MapPin className="size-3.5 shrink-0" />
                <span>{circle.city}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              {circle.memberCount > 0 && (
                <AttendeeAvatarStack
                  attendees={circle.topMembers}
                  totalCount={circle.memberCount}
                  label={
                    circle.topMembers.length < circle.memberCount
                      ? t("circleCard.moreMembers", { count: circle.memberCount - circle.topMembers.length })
                      : t("circleCard.members", { count: circle.memberCount })
                  }
                />
              )}
              {circle.membershipStatus === "PENDING" && (
                <Badge variant="outline" className="shrink-0 gap-1 border-amber-500/40 text-xs text-amber-500">
                  <Clock className="size-3" />
                  <span className="hidden sm:inline">{t("circleCard.roleBadge.pending")}</span>
                </Badge>
              )}
            </div>
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
