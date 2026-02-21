import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { getMomentGradient } from "@/lib/gradient";
import { Users, CalendarIcon } from "lucide-react";
import type { PublicCircle } from "@/domain/ports/repositories/circle-repository";

type Props = {
  circle: PublicCircle;
};

export async function PublicCircleCard({ circle }: Props) {
  const t = await getTranslations("Explorer");
  const tCategory = await getTranslations("CircleCategory");

  const gradient = getMomentGradient(circle.name);

  const nextMomentDate = circle.nextMoment
    ? circle.nextMoment.startsAt.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
      })
    : null;

  return (
    <Link href={`/circles/${circle.slug}`} className="group block">
      <div className="bg-card flex flex-col gap-4 rounded-2xl border p-5 transition-colors hover:border-primary/30">
        {/* Cover gradient (compact) */}
        <div className="relative">
          <div
            className="absolute inset-x-4 -bottom-2 h-6 opacity-50 blur-xl"
            style={{ background: gradient }}
          />
          <div
            className="relative w-full overflow-hidden rounded-xl"
            style={{ background: gradient, aspectRatio: "3 / 1" }}
          >
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex size-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <Users className="size-4 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-2">
          {/* Category + city */}
          <div className="flex flex-wrap items-center gap-1.5">
            {circle.category && (
              <Badge variant="secondary" className="text-xs">
                {tCategory(circle.category)}
              </Badge>
            )}
            {circle.city && (
              <span className="text-muted-foreground text-xs">{circle.city}</span>
            )}
          </div>

          {/* Name */}
          <h3 className="font-semibold leading-snug group-hover:underline">
            {circle.name}
          </h3>

          {/* Description (truncated) */}
          <p className="text-muted-foreground line-clamp-2 text-sm">
            {circle.description}
          </p>

          {/* Stats */}
          <div className="text-muted-foreground flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <Users className="size-3.5" />
              <span>{t("circleCard.members", { count: circle.memberCount })}</span>
            </div>
            {circle.upcomingMomentCount > 0 && (
              <div className="flex items-center gap-1">
                <CalendarIcon className="size-3.5" />
                <span>{t("circleCard.upcomingMoments", { count: circle.upcomingMomentCount })}</span>
              </div>
            )}
          </div>

          {/* Next moment teaser */}
          {circle.nextMoment && nextMomentDate && (
            <div className="border-border rounded-lg border bg-muted/40 px-3 py-2">
              <p className="text-muted-foreground text-xs font-medium">
                {t("circleCard.nextMoment")}
              </p>
              <p className="mt-0.5 truncate text-sm font-medium">
                {circle.nextMoment.title}
              </p>
              <p className="text-muted-foreground text-xs">{nextMomentDate}</p>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
