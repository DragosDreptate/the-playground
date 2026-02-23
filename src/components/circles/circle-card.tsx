"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe, Lock, Users, ImageIcon, Crown, User } from "lucide-react";
import { getMomentGradient } from "@/lib/gradient";
import type { Circle, CircleMemberRole } from "@/domain/models/circle";

type CircleCardProps = {
  circle: Circle;
  href?: string;
  role?: CircleMemberRole;
  memberCount?: number;
};

export function CircleCard({ circle, href, role, memberCount }: CircleCardProps) {
  const t = useTranslations("Common");
  const tDashboard = useTranslations("Dashboard");

  const VisibilityIcon = circle.visibility === "PUBLIC" ? Globe : Lock;
  const visibilityLabel = circle.visibility === "PUBLIC" ? t("public") : t("private");
  const gradient = getMomentGradient(circle.name);

  return (
    <div className="border-border bg-card hover:border-primary/30 flex items-center gap-4 rounded-xl border p-4 transition-colors">

      {/* Zone cliquable : avatar + contenu */}
      <Link href={href ?? `/dashboard/circles/${circle.slug}`} className="flex min-w-0 flex-1 items-start gap-4">
        {/* Avatar */}
        <div
          className="relative size-[72px] shrink-0 overflow-hidden rounded-xl"
          style={circle.coverImage ? undefined : { background: gradient }}
        >
          {circle.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={circle.coverImage}
              alt={circle.name}
              className="size-full object-cover"
            />
          ) : (
            <>
              <div className="absolute inset-0 bg-black/20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex size-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                  <ImageIcon className="size-4 text-white" />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Contenu */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-semibold leading-snug">{circle.name}</p>
            {role === "PLAYER" && (
              <Badge variant="outline" className="shrink-0 gap-1 border-primary/40 text-primary">
                <User className="size-3" />
                {tDashboard("role.player")}
              </Badge>
            )}
          </div>

          <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <VisibilityIcon className="size-3 shrink-0" />
              {visibilityLabel}
            </span>
            {memberCount !== undefined && (
              <span className="flex items-center gap-1">
                <Users className="size-3 shrink-0" />
                {tDashboard("memberCount", { count: memberCount })}
              </span>
            )}
          </div>

          {circle.description && (
            <p className="text-muted-foreground line-clamp-1 text-sm">
              {circle.description}
            </p>
          )}
        </div>
      </Link>

      {/* Colonne droite : Organisateur uniquement */}
      {role === "HOST" && (
        <div className="flex shrink-0 flex-col items-end justify-center gap-2">
          <Badge variant="outline" className="gap-1 border-primary/40 text-primary">
            <Crown className="size-3" />
            {tDashboard("role.host")}
          </Badge>
          <Button asChild size="sm" className="h-7 px-3 text-xs">
            <Link href={`/dashboard/circles/${circle.slug}/moments/new`}>
              {tDashboard("createMoment")}
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
