"use client";

import { useRouter, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { CircleCategory } from "@/domain/models/circle";

const CATEGORY_EMOJI: Record<CircleCategory, string> = {
  TECH: "💻",
  DESIGN: "🎨",
  BUSINESS: "📈",
  SPORT_WELLNESS: "🏃",
  ART_CULTURE: "🎭",
  SCIENCE_EDUCATION: "🔬",
  SOCIAL: "🤝",
  OTHER: "✨",
};

const CIRCLE_CATEGORIES: CircleCategory[] = [
  "TECH",
  "DESIGN",
  "BUSINESS",
  "SPORT_WELLNESS",
  "ART_CULTURE",
  "SCIENCE_EDUCATION",
  "SOCIAL",
  "OTHER",
];

type Props = {
  selectedCategory?: CircleCategory;
  activeTab: string;
};

export function ExplorerFilterBar({ selectedCategory, activeTab }: Props) {
  const t = useTranslations("Explorer");
  const tCategory = useTranslations("CircleCategory");
  const router = useRouter();
  const pathname = usePathname();

  function handleCategoryClick(category?: CircleCategory) {
    const params = new URLSearchParams();
    if (activeTab !== "circles") params.set("tab", activeTab);
    if (category) params.set("category", category);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      <button
        onClick={() => handleCategoryClick(undefined)}
        className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
          !selectedCategory
            ? "border-foreground bg-foreground text-background"
            : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
        }`}
      >
        {t("filters.allCategories")}
      </button>

      {CIRCLE_CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => handleCategoryClick(cat)}
          className={`shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
            selectedCategory === cat
              ? "border-foreground bg-foreground text-background"
              : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
          }`}
        >
          <span>{CATEGORY_EMOJI[cat]}</span>
          {tCategory(cat)}
        </button>
      ))}
    </div>
  );
}
