"use client";

import { useRouter, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { CircleCategory } from "@/domain/models/circle";

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
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => handleCategoryClick(undefined)}
        className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
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
          className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
            selectedCategory === cat
              ? "border-foreground bg-foreground text-background"
              : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
          }`}
        >
          {tCategory(cat)}
        </button>
      ))}
    </div>
  );
}
