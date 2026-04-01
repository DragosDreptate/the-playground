"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { getMomentGradient } from "@/lib/gradient";
import { MapPin } from "lucide-react";
import { AttendeeAvatarStack } from "@/components/moments/attendee-avatar-stack";
import { CategoryBadge } from "@/components/badges/category-badge";
import type { FeaturedCircle } from "@/domain/ports/repositories/circle-repository";
import { resolveCategoryLabel } from "@/lib/circle-category-helpers";

type Props = {
  circles: FeaturedCircle[];
};

export function ExplorerFeatured({ circles }: Props) {
  const t = useTranslations("Explorer");
  const tCategory = useTranslations("CircleCategory");

  if (circles.length === 0) return null;

  return (
    <div className="relative mb-8 overflow-hidden rounded-[20px] border border-border">
      {/* Backdrop cinématique — dark mode uniquement */}
      <div
        className="absolute inset-0 hidden scale-105 opacity-40 dark:block"
        style={{
          background: "linear-gradient(135deg, #6d28d9 0%, #9333ea 40%, #ec4899 100%)",
          filter: "blur(48px) saturate(1.4)",
        }}
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-background/85" />

      <div className="relative z-10 p-5 sm:p-6">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
              ✦ {t("featured.eyebrow")}
            </p>
            <h2 className="text-lg font-extrabold tracking-tight">
              {t("featured.title")}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
            <span
              className="size-1.5 shrink-0 animate-pulse rounded-full bg-emerald-500"
              style={{ boxShadow: "0 0 6px rgba(16,185,129,0.6)" }}
            />
            <span className="hidden sm:inline">{t("featured.refreshHint")}</span>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {circles.map((circle) => {
            const gradient = getMomentGradient(circle.name);
            const categoryLabel = resolveCategoryLabel(circle.category, circle.customCategory, tCategory);

            return (
              <Link
                key={circle.id}
                href={`/circles/${circle.slug}`}
                className="group flex gap-4 rounded-[14px] border border-border bg-card p-3 shadow-lg dark:shadow-none transition-colors hover:border-primary/30 hover:bg-card/70"
              >
                {/* Cover 1:1 — côté = hauteur du contenu (self-stretch + aspect-square) */}
                <div
                  className="relative size-[90px] shrink-0 overflow-hidden rounded-xl"
                  style={{ background: gradient }}
                >
                  <Image
                    src={circle.coverImage}
                    alt={circle.name}
                    fill
                    className="object-cover"
                    sizes="90px"
                    priority
                  />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1 flex flex-col justify-center gap-1">
                  {/* Ligne 1 : thématique */}
                  {categoryLabel && (
                    <CategoryBadge label={categoryLabel} className="min-w-0 truncate" />
                  )}
                  {/* Ligne 2 : nom */}
                  <p className="truncate text-base font-bold text-foreground group-hover:underline">
                    {circle.name}
                  </p>
                  {/* Ligne 3 : ville */}
                  {circle.city && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3 shrink-0" />
                      <span className="truncate">{circle.city}</span>
                    </div>
                  )}
                  {/* Ligne 4 : avatars membres */}
                  {circle.memberCount > 0 && (
                    <AttendeeAvatarStack
                      attendees={circle.topMembers}
                      totalCount={circle.memberCount}
                      label={
                        circle.memberCount > circle.topMembers.length
                          ? t("circleCard.moreMembers", { count: circle.memberCount - circle.topMembers.length })
                          : t("circleCard.members", { count: circle.memberCount })
                      }
                    />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
