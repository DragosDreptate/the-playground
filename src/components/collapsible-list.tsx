"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

const DEFAULT_LIMIT = 3;

type CollapsibleListProps = {
  items: ReactNode[];
  limit?: number;
};

export function CollapsibleList({ items, limit = DEFAULT_LIMIT }: CollapsibleListProps) {
  const [expanded, setExpanded] = useState(false);
  const t = useTranslations("Common");

  const visibleItems = expanded ? items : items.slice(0, limit);
  const hasMore = items.length > limit;

  return (
    <>
      <div className="space-y-2">
        {visibleItems}
      </div>
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              {t("showLess")}
              <ChevronUp className="ml-1 size-4" />
            </>
          ) : (
            <>
              {t("showMore")} ({items.length - limit})
              <ChevronDown className="ml-1 size-4" />
            </>
          )}
        </Button>
      )}
    </>
  );
}
