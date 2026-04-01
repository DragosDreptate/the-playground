"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { getMomentGradient } from "@/lib/gradient";
import { formatDayMonth, formatTime } from "@/lib/format-date";
import { CalendarIcon, MapPin, Crown, Users } from "lucide-react";
import { AttendeeAvatarStack } from "@/components/moments/attendee-avatar-stack";
import type { PublicCircle } from "@/domain/ports/repositories/circle-repository";
import type { CircleMemberRole } from "@/domain/models/circle";
import { Badge } from "@/components/ui/badge";
import { DemoBadge } from "@/components/badges/demo-badge";
import { CategoryBadge } from "@/components/badges/category-badge";
import { resolveCategoryLabel } from "@/lib/circle-category-helpers";

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

  const categoryLabel = resolveCategoryLabel(circle.category, circle.customCategory, tCategory);
  const categoryBadge = categoryLabel ? <CategoryBadge label={categoryLabel} /> : null;

  const memberOverflow = circle.memberCount - circle.topMembers.length;
  const memberLabel =
    memberOverflow > 0
      ? t("circleCard.moreMembers", { count: memberOverflow })
      : t("circleCard.members", { count: circle.memberCount });

  const roleBadge = membershipRole && (
    <Badge variant="outline" className="shrink-0 gap-1 border-primary/40 text-xs text-primary">
      {membershipRole === "HOST"
        ? <><Crown className="size-3" />{t("circleCard.roleBadge.host")}</>
        : <><Users className="size-3" />{t("circleCard.roleBadge.member")}</>}
    </Badge>
  );


  return (
    <Link href={`/circles/${circle.slug}`} className="group block min-w-0">
      <div className="bg-card dark:bg-[oklch(0.22_0.04_281.8)] overflow-hidden rounded-2xl border p-3 sm:p-4 shadow-lg dark:shadow-none transition-colors hover:border-primary/30">
        <div className="flex items-center gap-5 sm:gap-6">

          {/* Cover — 80px mobile / 140px desktop */}
          <div
            className="relative size-[80px] sm:size-[140px] shrink-0 overflow-hidden rounded-xl"
            style={circle.coverImage ? undefined : { background: gradient }}
          >
            {circle.coverImage && (
              <Image
                src={circle.coverImage}
                alt={circle.name}
                width={140}
                height={140}
                className="size-full object-cover"
                sizes="140px"
              />
            )}
            {circle.isDemo && <DemoBadge label={t("circleCard.demo")} />}
          </div>

          {/* Body */}
          <div className="min-w-0 flex-1 space-y-1 sm:space-y-1.5">
            {/* Badges — catégorie + rôle */}
            {(categoryBadge || roleBadge) && (
              <div className="flex items-center gap-2">
                {categoryBadge}
                {roleBadge}
              </div>
            )}
            {/* Titre — pleine largeur */}
            <h3 className="min-w-0 truncate text-sm sm:text-base font-semibold leading-snug group-hover:underline">
              {circle.name}
            </h3>
            <p className="text-muted-foreground line-clamp-1 sm:line-clamp-2 text-xs sm:text-sm">
              {circle.description}
            </p>
            <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
              {circle.city && (
                <div className="flex items-center gap-1">
                  <MapPin className="size-3.5 shrink-0" />
                  <span>{circle.city}</span>
                </div>
              )}
              {circle.upcomingMomentCount > 0 && (
                <div className="flex items-center gap-1">
                  <CalendarIcon className="size-3.5 shrink-0" />
                  <span>{t("circleCard.upcomingMoments", { count: circle.upcomingMomentCount })}</span>
                </div>
              )}
            </div>
            {circle.memberCount > 0 && (
              <AttendeeAvatarStack
                attendees={circle.topMembers}
                totalCount={circle.memberCount}
                label={memberLabel}
              />
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
