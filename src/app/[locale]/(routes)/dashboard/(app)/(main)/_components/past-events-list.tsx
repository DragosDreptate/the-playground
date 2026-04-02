"use client";

import { useState, Children, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 5;

export function PastEventsList({ children }: { children: ReactNode }) {
  const t = useTranslations("Dashboard");
  const items = Children.toArray(children);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  if (items.length === 0) return null;

  const hasMore = visibleCount < items.length;
  const remaining = items.length - visibleCount;

  return (
    <>
      {items.slice(0, visibleCount)}
      {hasMore && (
        <div className="flex items-center gap-0 pb-4 pt-2">
          <div className="w-[72px] shrink-0 pr-2 sm:w-[100px] sm:pr-4" />
          <div className="flex shrink-0 flex-col items-center">
            <div className="size-2 shrink-0" />
          </div>
          <div className="min-w-0 flex-1 pl-2 sm:pl-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
              className="text-muted-foreground hover:text-foreground -ml-3 gap-1.5 text-xs"
            >
              <ChevronDown className="size-3.5" />
              {t("showMorePast", { count: remaining })}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
