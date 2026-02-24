import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { getMomentGradient } from "@/lib/gradient";
import { Users, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardCircle } from "@/domain/models/circle";

type Props = {
  circle: DashboardCircle;
};

export async function DashboardCircleCard({ circle }: Props) {
  const t = await getTranslations("Explorer");
  const tDashboard = await getTranslations("Dashboard");
  const tCategory = await getTranslations("CircleCategory");

  const gradient = getMomentGradient(circle.name);

  const nextMomentDate = circle.nextMoment
    ? circle.nextMoment.startsAt.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
      })
    : null;

  return (
    <div className="bg-card flex flex-col overflow-hidden rounded-2xl border border-border p-4 transition-colors hover:border-primary/30 sm:p-5">
      {/* Zone cliquable : cover + contenu */}
      <Link href={`/dashboard/circles/${circle.slug}`} className="group block">
        {/* Cover 1:1 */}
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

        {/* Contenu */}
        <div className="space-y-2">
          {/* Catégorie + rôle + ville */}
          <div className="flex flex-wrap items-center gap-1.5">
            {circle.category && (
              <span className="text-xs font-semibold text-foreground">
                {tCategory(circle.category)}
              </span>
            )}
            <span className="inline-flex items-center rounded border border-primary/40 px-1.5 py-0.5 text-xs font-medium text-primary">
              {circle.memberRole === "HOST"
                ? t("circleCard.roleBadge.host")
                : t("circleCard.roleBadge.member")}
            </span>
            {circle.city && (
              <span className="text-xs text-muted-foreground">{circle.city}</span>
            )}
          </div>

          <h3 className="font-semibold leading-snug group-hover:underline">{circle.name}</h3>

          <p className="line-clamp-2 text-sm text-muted-foreground">{circle.description}</p>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
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

          {/* Prochain événement */}
          {circle.nextMoment && nextMomentDate && (
            <div className="rounded-lg border border-border bg-muted/40 px-2 py-2">
              <p className="text-xs font-medium text-muted-foreground">
                {t("circleCard.nextMoment")}
              </p>
              <p className="mt-0.5 truncate text-sm font-medium">{circle.nextMoment.title}</p>
              <p className="text-xs text-muted-foreground">{nextMomentDate}</p>
            </div>
          )}
        </div>
      </Link>

      {/* Bouton Créer un événement — HOST uniquement */}
      {circle.memberRole === "HOST" && (
        <div className="mt-3">
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href={`/dashboard/circles/${circle.slug}/moments/new`}>
              {tDashboard("createMoment")}
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
