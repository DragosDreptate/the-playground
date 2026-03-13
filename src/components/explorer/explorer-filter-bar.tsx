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

  function handleCategoryChange(value: string) {
    const category = value === "ALL" ? undefined : (value as CircleCategory);
    const params = new URLSearchParams();
    if (activeTab !== "circles") params.set("tab", activeTab);
    if (category) params.set("category", category);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <Select
      value={selectedCategory ?? "ALL"}
      onValueChange={handleCategoryChange}
    >
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
  );
}
