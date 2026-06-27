"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { CalendarIcon, MapPin, Crown, Users, Clock } from "lucide-react";
import { getMomentGradient } from "@/lib/gradient";
import { formatDayMonth, formatTime } from "@/lib/format-date";
import { resolveCategoryLabel } from "@/lib/circle-category-helpers";
import { AttendeeAvatarStack } from "@/components/moments/attendee-avatar-stack";
import { CategoryBadge } from "@/components/badges/category-badge";
import { DemoBadge } from "@/components/badges/demo-badge";
import { Badge } from "@/components/ui/badge";
import type { PublicCircle } from "@/domain/ports/repositories/circle-repository";
import type { CircleMemberRole, DashboardCircle } from "@/domain/models/circle";

/**
 * Carte de Communauté unifiée (issue #597).
 *
 * Deux variantes (`public` / `dashboard`) et deux branches de présentation :
 * - `< sm` : format HORIZONTAL — markup repris des cartes actuelles
 *   (PublicCircleCard / DashboardCircleCard), inchangé visuellement sur mobile.
 * - `≥ sm` : format VERTICAL en grille — nouveau (différenciation vs événements).
 *
 * Composant client : il est rendu aussi bien depuis ExplorerGrid (client) que
 * depuis DashboardContent (server). Voir spec/features/circle-card-vertical.md.
 */
type CommunityCardProps =
  | {
      variant: "public";
      circle: PublicCircle;
      membershipRole?: CircleMemberRole | null;
      hideNextMoment?: boolean;
    }
  | {
      variant: "dashboard";
      circle: DashboardCircle;
    };

// Hover unifié (#597) : élévation neutre, plus de highlight rose.
const CARD_HOVER =
  "transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-xl";

export function CommunityCard(props: CommunityCardProps) {
  if (props.variant === "dashboard") {
    return <DashboardVariant circle={props.circle} />;
  }
  return (
    <PublicVariant
      circle={props.circle}
      membershipRole={props.membershipRole}
      hideNextMoment={props.hideNextMoment}
    />
  );
}

/* ─────────────────────────── Variante publique ─────────────────────────── */

function PublicVariant({
  circle,
  membershipRole,
  hideNextMoment,
}: {
  circle: PublicCircle;
  membershipRole?: CircleMemberRole | null;
  hideNextMoment?: boolean;
}) {
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

  const roleBadge = membershipRole ? (
    <Badge variant="outline" className="shrink-0 gap-1 border-primary/40 text-xs text-primary">
      {membershipRole === "HOST" ? (
        <>
          <Crown className="size-3" />
          <span className="hidden sm:inline">{t("circleCard.roleBadge.host")}</span>
        </>
      ) : (
        <>
          <Users className="size-3" />
          <span className="hidden sm:inline">{t("circleCard.roleBadge.member")}</span>
        </>
      )}
    </Badge>
  ) : null;

  return (
    <Link href={`/circles/${circle.slug}`} className="group block min-w-0">
      {/* ─── Mobile (< sm) : horizontal — repris de PublicCircleCard ─── */}
      <div
        className={`sm:hidden bg-card dark:bg-[oklch(0.22_0.04_281.8)] overflow-hidden rounded-2xl border p-3 shadow-lg dark:shadow-none ${CARD_HOVER}`}
      >
        <div className="flex items-center gap-6">
          <div
            className="relative size-[88px] shrink-0 overflow-hidden rounded-xl"
            style={circle.coverImage ? undefined : { background: gradient }}
          >
            {circle.coverImage && (
              <Image
                src={circle.coverImage}
                alt={circle.name}
                width={150}
                height={150}
                className="size-full object-cover"
                sizes="150px"
              />
            )}
            {circle.isDemo && <DemoBadge label={t("circleCard.demo")} />}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            {categoryBadge && <div className="flex items-center gap-2">{categoryBadge}</div>}
            <h3 className="min-w-0 truncate text-sm font-semibold leading-snug">{circle.name}</h3>
            <p className="text-muted-foreground line-clamp-1 text-xs">{circle.description}</p>
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
            {(circle.memberCount > 0 || roleBadge) && (
              <div className="flex items-center gap-2">
                {circle.memberCount > 0 && (
                  <AttendeeAvatarStack
                    attendees={circle.topMembers}
                    totalCount={circle.memberCount}
                    label={memberLabel}
                  />
                )}
                {roleBadge}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Desktop / tablette (≥ sm) : vertical en grille — nouveau ─── */}
      <div
        className={`hidden sm:flex sm:flex-col bg-card dark:bg-[oklch(0.22_0.04_281.8)] overflow-hidden rounded-2xl border shadow-lg dark:shadow-none ${CARD_HOVER}`}
      >
        {/* Cover 1:1 + overlays */}
        <div
          className="relative aspect-square w-full overflow-hidden"
          style={circle.coverImage ? undefined : { background: gradient }}
        >
          {circle.coverImage && (
            <Image
              src={circle.coverImage}
              alt={circle.name}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 50vw, 340px"
            />
          )}
          {circle.isDemo && <DemoBadge label={t("circleCard.demo")} />}
          {roleBadge && (
            <div className="absolute right-2 top-2 rounded-full bg-card/85 backdrop-blur-sm">
              {roleBadge}
            </div>
          )}
        </div>
        {/* Corps */}
        <div className="flex flex-1 flex-col gap-1.5 p-4">
          {categoryBadge && <div className="flex items-center gap-2">{categoryBadge}</div>}
          <h3 className="min-w-0 truncate text-base font-semibold leading-snug">{circle.name}</h3>
          <p className="text-muted-foreground line-clamp-2 text-sm">{circle.description}</p>
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
          {!hideNextMoment && (
            <div className="mt-auto pt-1.5">
              {circle.nextMoment && nextMomentDate ? (
                <div className="flex flex-col gap-1 rounded-xl border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  <p className="truncate font-medium text-foreground">{circle.nextMoment.title}</p>
                  <div className="flex items-center gap-1.5">
                    <CalendarIcon className="size-3 shrink-0 text-primary" />
                    <span className="whitespace-nowrap">
                      {nextMomentDate} · {nextMomentTime}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                  {t("circleCard.noUpcomingMoments")}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ─────────────────────────── Variante dashboard ────────────────────────── */

function DashboardVariant({ circle }: { circle: DashboardCircle }) {
  const t = useTranslations("Explorer");
  const tCategory = useTranslations("CircleCategory");
  const locale = useLocale();

  const gradient = getMomentGradient(circle.name);

  const nextMomentStart = circle.nextMoment ? new Date(circle.nextMoment.startsAt) : null;
  const nextMomentDate = nextMomentStart ? formatDayMonth(nextMomentStart, locale) : null;
  const nextMomentTime = nextMomentStart ? formatTime(nextMomentStart) : null;

  const categoryLabel = resolveCategoryLabel(circle.category, circle.customCategory, tCategory);

  const memberLabel =
    circle.topMembers.length < circle.memberCount
      ? t("circleCard.moreMembers", { count: circle.memberCount - circle.topMembers.length })
      : t("circleCard.members", { count: circle.memberCount });

  const href =
    circle.membershipStatus === "PENDING"
      ? `/circles/${circle.slug}`
      : `/dashboard/circles/${circle.slug}`;

  const pendingBadge =
    circle.membershipStatus === "PENDING" ? (
      <Badge variant="outline" className="shrink-0 gap-1 border-amber-500/40 text-xs text-amber-500">
        <Clock className="size-3" />
        <span className="hidden sm:inline">{t("circleCard.roleBadge.pending")}</span>
      </Badge>
    ) : null;

  return (
    <Link href={href} className="group block min-w-0">
      {/* ─── Mobile (< sm) : horizontal — repris de DashboardCircleCard ─── */}
      <div
        className={`sm:hidden bg-card overflow-hidden rounded-2xl border p-3 shadow-lg dark:shadow-none ${CARD_HOVER}`}
      >
        <div className="flex items-center gap-4">
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
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            {categoryLabel && (
              <div className="flex items-center gap-2">
                <CategoryBadge label={categoryLabel} />
              </div>
            )}
            <h3 className="truncate text-sm font-semibold leading-snug">{circle.name}</h3>
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
                  label={memberLabel}
                />
              )}
              {pendingBadge}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Desktop / tablette (≥ sm) : vertical en grille — nouveau ─── */}
      <div
        className={`hidden sm:flex sm:flex-col bg-card overflow-hidden rounded-2xl border shadow-lg dark:shadow-none ${CARD_HOVER}`}
      >
        <div
          className="relative aspect-square w-full overflow-hidden"
          style={circle.coverImage ? undefined : { background: gradient }}
        >
          {circle.coverImage && (
            <Image
              src={circle.coverImage}
              alt={circle.name}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 50vw, 340px"
            />
          )}
          {pendingBadge && (
            <div className="absolute right-2 top-2 rounded-full bg-card/85 backdrop-blur-sm">
              {pendingBadge}
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-4">
          {categoryLabel && (
            <div className="flex items-center gap-2">
              <CategoryBadge label={categoryLabel} />
            </div>
          )}
          <h3 className="truncate text-base font-semibold leading-snug">{circle.name}</h3>
          {circle.city && (
            <div className="text-muted-foreground flex items-center gap-1 text-xs">
              <MapPin className="size-3.5 shrink-0" />
              <span>{circle.city}</span>
            </div>
          )}
          {circle.memberCount > 0 && (
            <AttendeeAvatarStack
              attendees={circle.topMembers}
              totalCount={circle.memberCount}
              label={memberLabel}
            />
          )}
          <div className="mt-auto pt-1.5">
            {circle.nextMoment && nextMomentDate ? (
              <div className="flex flex-col gap-1 rounded-xl border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                <p className="text-muted-foreground/70 text-[0.6rem] font-medium uppercase tracking-wider">
                  {t("circleCard.nextMoment")}
                </p>
                <div className="flex items-center gap-1.5">
                  <CalendarIcon className="size-3 shrink-0 text-foreground" />
                  <span className="whitespace-nowrap">
                    {nextMomentDate} · {nextMomentTime}
                  </span>
                </div>
                <p className="line-clamp-2 min-w-0 break-words font-medium leading-snug text-foreground">
                  {circle.nextMoment.title}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                {t("circleCard.noUpcomingMoments")}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
