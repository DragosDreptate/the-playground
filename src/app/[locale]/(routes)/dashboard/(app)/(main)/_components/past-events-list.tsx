"use client";

import { useState, Children, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 5;

export function PastEventsList({ children }: { children: ReactNode }) {
  const t = useTranslations("Dashboard");
  const items = Children.toArray(children);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  if (items.length === 0) return null;

  const hasMore = visibleCount < items.length;

  return (
    <>
      {items.slice(0, visibleCount)}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
            className="min-w-32"
          >
            {t("showMorePast")}
          </Button>
        </div>
      )}
    </>
  );
}
