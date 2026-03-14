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
    <div className="relative mb-8 overflow-hidden rounded-[20px] border">
      {/* Backdrop cinématique */}
      <div
        className="absolute inset-0 scale-105 opacity-30"
        style={{
          background:
            "linear-gradient(135deg, #7e22ce 0%, #1d4ed8 30%, #ec4899 60%, #16a34a 100%)",
          filter: "blur(40px) saturate(1.2)",
        }}
      />
      {/* Overlay sombre */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(10,10,14,0.92) 0%, rgba(20,14,28,0.88) 100%)",
        }}
      />

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
                className="group flex items-center gap-3 rounded-[14px] p-3 transition-all"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  backdropFilter: "blur(10px)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                  e.currentTarget.style.borderColor = "rgba(236,72,153,0.35)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                }}
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
                    <div
                      className="mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px]"
                      style={{
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "rgba(240,240,245,0.6)",
                      }}
                    >
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
