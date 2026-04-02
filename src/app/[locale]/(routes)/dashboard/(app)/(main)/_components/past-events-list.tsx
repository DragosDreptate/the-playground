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
        <div className="flex gap-0 pt-4">
          <div className="w-[72px] shrink-0 sm:w-[100px]" />
          <div className="shrink-0" />
          <div className="flex min-w-0 flex-1 justify-center pl-2 sm:pl-4">
            <Button
              variant="outline"
              onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
              className="min-w-32"
            >
              {t("showMorePast")}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
