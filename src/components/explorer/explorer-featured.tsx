"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { getMomentGradient } from "@/lib/gradient";
import { Users } from "lucide-react";
import type { FeaturedCircle } from "@/domain/ports/repositories/circle-repository";

type Props = {
  circles: FeaturedCircle[];
};

export function ExplorerFeatured({ circles }: Props) {
  const t = useTranslations("Explorer");
  const tCategory = useTranslations("CircleCategory");

  if (circles.length === 0) return null;

  return (
    <div className="relative mb-8 overflow-hidden rounded-[20px] border border-border">
      {/* Backdrop — palette rose/violet du design system */}
      <div
        className="absolute inset-0 scale-105 opacity-45"
        style={{
          background: "linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%)",
          filter: "blur(48px) saturate(1.4)",
        }}
      />
      {/* Overlay sombre */}
      <div className="absolute inset-0 bg-background/90" />

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
            const categoryLabel =
              circle.category === "OTHER" && circle.customCategory
                ? circle.customCategory
                : circle.category
                  ? tCategory(circle.category)
                  : null;

            return (
              <Link
                key={circle.id}
                href={`/circles/${circle.slug}`}
                className="group flex items-center gap-3 rounded-[14px] border border-border bg-card p-3 transition-colors hover:border-primary/30 hover:bg-card/70"
              >
                {/* Cover 1:1 */}
                <div
                  className="relative size-[72px] shrink-0 overflow-hidden rounded-xl"
                  style={{ background: gradient }}
                >
                  <Image
                    src={circle.coverImage}
                    alt={circle.name}
                    width={72}
                    height={72}
                    className="size-full object-cover"
                    sizes="72px"
                  />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  {/* Badge */}
                  <div className="mb-1 inline-flex items-center gap-1 rounded-full border border-primary/35 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    <svg
                      width="8"
                      height="8"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    {t("featured.badge")}
                  </div>
                  <p className="truncate text-sm font-bold text-foreground group-hover:underline">
                    {circle.name}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="size-3 shrink-0" />
                    <span>
                      {t("circleCard.members", { count: circle.memberCount })}
                    </span>
                  </div>
                  {categoryLabel && (
                    <div className="mt-1.5 inline-block rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                      {categoryLabel}
                    </div>
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
