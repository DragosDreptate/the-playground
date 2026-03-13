"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { getMomentGradient } from "@/lib/gradient";
import { formatDayMonth, formatTime } from "@/lib/format-date";
import { Users, CalendarIcon } from "lucide-react";
import type { PublicCircle } from "@/domain/ports/repositories/circle-repository";
import type { CircleMemberRole } from "@/domain/models/circle";
import { DemoBadge } from "@/components/badges/demo-badge";

type Props = {
  circle: PublicCircle;
  membershipRole?: CircleMemberRole | null;
};

export function PublicCircleCard({ circle, membershipRole }: Props) {
  const t = useTranslations("Explorer");
  const tCategory = useTranslations("CircleCategory");
  const locale = useLocale();

  const gradient = getMomentGradient(circle.name);

  const nextMomentStart = circle.nextMoment ? new Date(circle.nextMoment.startsAt) : null;
  const nextMomentDate = nextMomentStart ? formatDayMonth(nextMomentStart, locale) : null;
  const nextMomentTime = nextMomentStart ? formatTime(nextMomentStart) : null;

  const categoryLabel =
    circle.category === "OTHER" && circle.customCategory
      ? circle.customCategory
      : circle.category
        ? tCategory(circle.category)
        : null;

  const categoryBadge = categoryLabel && (
    <span className="text-foreground text-xs font-semibold">
      {categoryLabel}
    </span>
  );

  const roleBadge = membershipRole && (
    <span className="inline-flex items-center rounded border border-primary/40 px-1.5 py-0.5 text-xs font-medium text-primary">
      {membershipRole === "HOST"
        ? t("circleCard.roleBadge.host")
        : t("circleCard.roleBadge.member")}
    </span>
  );

  const cityLabel = circle.city && (
    <span className="text-muted-foreground text-xs">{circle.city}</span>
  );

  return (
    <Link href={`/circles/${circle.slug}`} className="group block min-w-0">
      <div className="bg-card overflow-hidden rounded-2xl border p-3 sm:p-4 transition-colors hover:border-primary/30">
        <div className="flex items-center gap-3 sm:gap-4">

          {/* Cover — 72px mobile / 120px desktop */}
          <div
            className="relative size-[72px] sm:size-[120px] shrink-0 overflow-hidden rounded-xl"
            style={circle.coverImage ? undefined : { background: gradient }}
          >
            {circle.coverImage && (
              <Image
                src={circle.coverImage}
                alt={circle.name}
                width={120}
                height={120}
                className="size-full object-cover"
                sizes="120px"
              />
            )}
            {circle.isDemo && <DemoBadge label={t("circleCard.demo")} />}
          </div>

          {/* Body */}
          <div className="min-w-0 flex-1 space-y-1 sm:space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {categoryBadge}
              {roleBadge}
              {cityLabel}
            </div>
            <h3 className="text-sm sm:text-base font-semibold leading-snug group-hover:underline">
              {circle.name}
            </h3>
            <p className="text-muted-foreground line-clamp-1 sm:line-clamp-2 text-xs sm:text-sm">
              {circle.description}
            </p>
            <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
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
            {/* Next event — mobile only, block below stats */}
            {circle.nextMoment && nextMomentDate && (
              <div className="rounded-lg border border-border bg-muted/40 px-2 py-1.5 sm:hidden">
                <p className="text-muted-foreground text-xs font-medium">{t("circleCard.nextMoment")}</p>
                <p className="mt-0.5 truncate text-xs font-medium">{circle.nextMoment.title}</p>
              </div>
            )}
          </div>

          {/* Right column — desktop only */}
          <div className="hidden sm:flex shrink-0 items-center ml-4">
            {circle.nextMoment && nextMomentDate ? (
              <div className="flex flex-col gap-1 rounded-xl border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground max-w-[220px]">
                <p className="truncate font-medium text-foreground">{circle.nextMoment.title}</p>
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
