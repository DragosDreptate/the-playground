import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { getMomentGradient } from "@/lib/gradient";
import { Users, CalendarIcon } from "lucide-react";
import type { PublicCircle } from "@/domain/ports/repositories/circle-repository";
import type { CircleMemberRole } from "@/domain/models/circle";

type Props = {
  circle: PublicCircle;
  membershipRole?: CircleMemberRole | null;
};

export async function PublicCircleCard({ circle, membershipRole }: Props) {
  const t = await getTranslations("Explorer");
  const tCategory = await getTranslations("CircleCategory");

  const gradient = getMomentGradient(circle.name);

  const nextMomentDate = circle.nextMoment
    ? circle.nextMoment.startsAt.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
      })
    : null;

  const categoryBadge = circle.category && (
    <span className="text-foreground text-xs font-semibold">
      {tCategory(circle.category)}
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

  const stats = (
    <div className="text-muted-foreground flex items-center gap-3 text-xs">
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
  );

  const nextMomentTeaser = circle.nextMoment && nextMomentDate && (
    <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
      <p className="text-muted-foreground text-xs font-medium">
        {t("circleCard.nextMoment")}
      </p>
      <p className="mt-0.5 truncate text-sm font-medium">
        {circle.nextMoment.title}
      </p>
      <p className="text-muted-foreground text-xs">{nextMomentDate}</p>
    </div>
  );

  return (
    <Link href={`/circles/${circle.slug}`} className="group block min-w-0">
      <div className="bg-card overflow-hidden rounded-2xl border p-4 transition-colors hover:border-primary/30 sm:p-5">
        {/* ── Mobile: compact horizontal ── */}
        <div className="sm:hidden">
          <div className="flex items-start gap-3">
            {/* Thumbnail — cover image ou gradient */}
            <div
              className="size-[72px] shrink-0 overflow-hidden rounded-xl"
              style={circle.coverImage ? undefined : { background: gradient }}
            >
              {circle.coverImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={circle.coverImage}
                  alt={circle.name}
                  className="size-full object-cover"
                />
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {categoryBadge}
                {roleBadge}
                {cityLabel}
              </div>
              <h3 className="truncate text-sm font-semibold group-hover:underline">
                {circle.name}
              </h3>
              <p className="text-muted-foreground line-clamp-1 text-xs">
                {circle.description}
              </p>
              {stats}
            </div>
          </div>

          {/* Next moment teaser — full width below */}
          {nextMomentTeaser && <div className="mt-3">{nextMomentTeaser}</div>}
        </div>

        {/* ── Desktop: vertical card ── */}
        <div className="hidden sm:block">
          {/* Cover — image ou gradient */}
          <div className="relative mb-4">
            <div
              className="absolute inset-x-4 -bottom-2 h-6 opacity-50 blur-xl"
              style={{ background: gradient }}
            />
            <div className="relative aspect-square w-full overflow-hidden rounded-xl">
              {circle.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={circle.coverImage}
                  alt={circle.name}
                  className="size-full object-cover"
                />
              ) : (
                <>
                  <div className="size-full" style={{ background: gradient }} />
                  <div className="absolute inset-0 bg-black/20" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex size-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                      <Users className="size-4 text-white" />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {categoryBadge}
              {roleBadge}
              {cityLabel}
            </div>
            <h3 className="font-semibold leading-snug group-hover:underline">
              {circle.name}
            </h3>
            <p className="text-muted-foreground line-clamp-2 text-sm">
              {circle.description}
            </p>
            {stats}
            {nextMomentTeaser}
          </div>
        </div>
      </div>
    </Link>
  );
}
