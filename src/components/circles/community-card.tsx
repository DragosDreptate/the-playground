"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { CalendarIcon, MapPin, Crown, Users, Clock, type LucideIcon } from "lucide-react";
import { getMomentGradient, COVER_IMAGE_BG } from "@/lib/gradient";
import { formatDayMonth, formatTime } from "@/lib/format-date";
import { resolveCategoryLabel } from "@/lib/circle-category-helpers";
import { AttendeeAvatarStack } from "@/components/moments/attendee-avatar-stack";
import { CategoryBadge } from "@/components/badges/category-badge";
import { DemoBadge } from "@/components/badges/demo-badge";
import { Badge } from "@/components/ui/badge";
import { CARD_HOVER, IconPill } from "@/components/cards/card-primitives";
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

  const gradient = getMomentGradient(circle.name);
  const categoryLabel = resolveCategoryLabel(circle.category, circle.customCategory, tCategory);
  const categoryBadge = categoryLabel ? <CategoryBadge label={categoryLabel} /> : null;

  const RoleIcon = membershipRole === "HOST" ? Crown : Users;
  const roleLabel =
    membershipRole === "HOST"
      ? t("circleCard.roleBadge.host")
      : t("circleCard.roleBadge.member");

  // Badge rôle inline (mobile, dans le body).
  const roleBadge = membershipRole ? (
    <Badge variant="outline" className="shrink-0 gap-1 border-primary/40 text-xs text-primary">
      <RoleIcon className="size-3" />
      <span className="hidden sm:inline">{roleLabel}</span>
    </Badge>
  ) : null;

  return (
    <Link href={`/circles/${circle.slug}`} className="group block min-w-0">
      {/* ─── Mobile (< sm) : horizontal — repris de PublicCircleCard ─── */}
      <div
        className={`sm:hidden bg-card overflow-hidden rounded-2xl border p-3 shadow-lg dark:shadow-none ${CARD_HOVER}`}
      >
        <div className="flex items-center gap-6">
          <div
            className={`relative size-[88px] shrink-0 overflow-hidden rounded-xl ${circle.coverImage ? COVER_IMAGE_BG : ""}`}
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
                <MemberStack memberCount={circle.memberCount} topMembers={circle.topMembers} />
                {roleBadge}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Desktop / tablette (≥ sm) : vertical en grille — nouveau ─── */}
      <div
        className={`hidden sm:flex sm:flex-col bg-card overflow-hidden rounded-2xl border shadow-lg dark:shadow-none ${CARD_HOVER}`}
      >
        <VerticalCover coverImage={circle.coverImage} name={circle.name} gradient={gradient}>
          {circle.isDemo && <DemoBadge label={t("circleCard.demo")} size="md" />}
          {membershipRole && (
            <CoverBadgeOverlay
              icon={RoleIcon}
              label={roleLabel}
              className="border-primary/40 text-primary"
            />
          )}
        </VerticalCover>
        <VerticalCardBody
          categoryLabel={categoryLabel}
          name={circle.name}
          description={circle.description}
          city={circle.city}
          memberCount={circle.memberCount}
          topMembers={circle.topMembers}
          nextMoment={circle.nextMoment}
          hideNextMoment={hideNextMoment}
        />
      </div>
    </Link>
  );
}

/* ─────────────────────────── Variante dashboard ────────────────────────── */

function DashboardVariant({ circle }: { circle: DashboardCircle }) {
  const t = useTranslations("Explorer");
  const tCategory = useTranslations("CircleCategory");

  const gradient = getMomentGradient(circle.name);
  const categoryLabel = resolveCategoryLabel(circle.category, circle.customCategory, tCategory);

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
            className={`size-[100px] shrink-0 overflow-hidden rounded-xl ${circle.coverImage ? COVER_IMAGE_BG : ""}`}
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
              <MemberStack memberCount={circle.memberCount} topMembers={circle.topMembers} />
              {pendingBadge}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Desktop / tablette (≥ sm) : vertical en grille — nouveau ─── */}
      <div
        className={`hidden sm:flex sm:flex-col bg-card overflow-hidden rounded-2xl border shadow-lg dark:shadow-none ${CARD_HOVER}`}
      >
        <VerticalCover coverImage={circle.coverImage} name={circle.name} gradient={gradient}>
          {circle.membershipStatus === "PENDING" && (
            <CoverBadgeOverlay
              icon={Clock}
              label={t("circleCard.roleBadge.pending")}
              className="border-amber-500/40 text-amber-500"
            />
          )}
        </VerticalCover>
        <VerticalCardBody
          categoryLabel={categoryLabel}
          name={circle.name}
          description={circle.description}
          city={circle.city}
          memberCount={circle.memberCount}
          topMembers={circle.topMembers}
          nextMoment={circle.nextMoment}
        />
      </div>
    </Link>
  );
}

/* ───────────────────── Sous-composants partagés (≥ sm) ──────────────────── */

type AttendeeStackProp = React.ComponentProps<typeof AttendeeAvatarStack>["attendees"];

/** Corps du format vertical (≥ sm), commun aux variantes public et dashboard. */
function VerticalCardBody({
  categoryLabel,
  name,
  description,
  city,
  memberCount,
  topMembers,
  nextMoment,
  hideNextMoment = false,
}: {
  categoryLabel: string | null;
  name: string;
  description: string | null;
  city: string | null;
  memberCount: number;
  topMembers: AttendeeStackProp;
  nextMoment: { startsAt: Date | string; title: string } | null;
  hideNextMoment?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col gap-2 p-4">
      {categoryLabel && (
        <div className="flex items-center gap-2">
          <CategoryBadge label={categoryLabel} />
        </div>
      )}
      <h3 className="min-w-0 truncate text-base font-semibold leading-snug">{name}</h3>
      <p className="text-muted-foreground line-clamp-2 text-sm">{description}</p>
      {city && <CityRowVertical city={city} />}
      <MemberStack memberCount={memberCount} topMembers={topMembers} />
      {!hideNextMoment && (
        <div className="mt-auto pt-2">
          <NextMomentBlock nextMoment={nextMoment} />
        </div>
      )}
    </div>
  );
}

/** Cover carrée 1:1 du format vertical, gradient en fallback. `children` = overlays. */
function VerticalCover({
  coverImage,
  name,
  gradient,
  children,
}: {
  coverImage: string | null;
  name: string;
  gradient: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`relative aspect-square w-full overflow-hidden ${coverImage ? COVER_IMAGE_BG : ""}`}
      style={coverImage ? undefined : { background: gradient }}
    >
      {coverImage && (
        <Image
          src={coverImage}
          alt={name}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 50vw, 340px"
        />
      )}
      {children}
    </div>
  );
}

/** Pill positionné en haut à droite de la cover (badge rôle / en attente). Une seule
 * couche : la bordure épouse le pill rounded-full (pas de Badge imbriqué). */
function CoverBadgeOverlay({
  icon: Icon,
  label,
  className,
}: {
  icon: LucideIcon;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={`absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border bg-white/85 px-2.5 py-1 text-xs font-medium backdrop-blur-sm ${className ?? ""}`}
    >
      <Icon className="size-3 shrink-0" />
      <span>{label}</span>
    </div>
  );
}

/** Ligne ville du format vertical : pastille grise + icône + libellé. */
function CityRowVertical({ city }: { city: string }) {
  return (
    <div className="text-muted-foreground flex items-center gap-2 text-sm">
      <IconPill icon={MapPin} size="md" />
      <span>{city}</span>
    </div>
  );
}

/** Pile d'avatars des membres + libellé (rien si la Communauté n'a aucun membre). */
function MemberStack({
  memberCount,
  topMembers,
}: {
  memberCount: number;
  topMembers: AttendeeStackProp;
}) {
  const t = useTranslations("Explorer");
  if (memberCount <= 0) return null;
  const overflow = memberCount - topMembers.length;
  const label =
    overflow > 0
      ? t("circleCard.moreMembers", { count: overflow })
      : t("circleCard.members", { count: memberCount });
  return <AttendeeAvatarStack attendees={topMembers} totalCount={memberCount} label={label} />;
}

/** Encart « prochain événement » du format vertical (état plein ou vide). */
function NextMomentBlock({
  nextMoment,
}: {
  nextMoment: { startsAt: Date | string; title: string } | null;
}) {
  const t = useTranslations("Explorer");
  const locale = useLocale();

  if (nextMoment) {
    const start = new Date(nextMoment.startsAt);
    return (
      <div className="flex flex-col gap-1 rounded-xl border border-border bg-muted/50 px-3 py-2">
        <div className="text-muted-foreground flex items-center gap-1.5">
          <IconPill icon={CalendarIcon} size="sm" />
          <span className="text-[0.6rem] font-semibold uppercase tracking-wider">
            {t("circleCard.nextMoment")}
          </span>
        </div>
        <p className="line-clamp-2 text-xs font-semibold leading-snug text-foreground">
          {nextMoment.title}
        </p>
        <p className="text-muted-foreground text-[0.7rem]">
          {formatDayMonth(start, locale)} · {formatTime(start)}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
      {t("circleCard.noUpcomingMoments")}
    </div>
  );
}
