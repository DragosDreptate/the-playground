"use client";

import { useState, Children, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type Props = {
  children: ReactNode;
  initialCount?: number;
  step?: number;
};

export function PaginatedMomentList({
  children,
  initialCount = 10,
  step = 5,
}: Props) {
  const t = useTranslations("Common");
  const items = Children.toArray(children);
  const [visibleCount, setVisibleCount] = useState(initialCount);

  if (items.length === 0) return null;

  const hasMore = visibleCount < items.length;

  return (
    <>
      {items.slice(0, visibleCount)}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => setVisibleCount((v) => v + step)}
            className="min-w-32"
          >
            {t("showMore")}
          </Button>
        </div>
      )}
    </>
  );
}
