"use client";

import { useRouter, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CircleCategory } from "@/domain/models/circle";
import type { ExplorerSortBy } from "@/domain/ports/repositories/circle-repository";

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
  sortBy: ExplorerSortBy;
  activeTab: string;
};

export function ExplorerFilterBar({ selectedCategory, sortBy, activeTab }: Props) {
  const t = useTranslations("Explorer");
  const tCategory = useTranslations("CircleCategory");
  const router = useRouter();
  const pathname = usePathname();

  function buildHref(category?: CircleCategory, sort?: ExplorerSortBy) {
    const params = new URLSearchParams();
    if (activeTab !== "circles") params.set("tab", activeTab);
    if (category) params.set("category", category);
    if (sort && sort !== "date") params.set("sortBy", sort);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  function handleCategoryChange(value: string) {
    const category = value === "ALL" ? undefined : (value as CircleCategory);
    router.push(buildHref(category, sortBy));
  }

  function handleSortChange(value: string) {
    router.push(buildHref(selectedCategory, value as ExplorerSortBy));
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedCategory ?? "ALL"} onValueChange={handleCategoryChange}>
        <SelectTrigger className="w-fit min-w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t("filters.allCategories")}</SelectItem>
          {CIRCLE_CATEGORIES.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {tCategory(cat)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={sortBy} onValueChange={handleSortChange}>
        <SelectTrigger className="w-fit min-w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="date">{t("filters.sortBy.date")}</SelectItem>
          <SelectItem value="popular">{t("filters.sortBy.popular")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
