"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp } from "lucide-react";
import { linkifyText } from "@/lib/linkify";

type Props = {
  text: string;
  /** Max visible lines before collapsing (default 10) */
  maxLines?: number;
};

const clampBase = {
  display: "-webkit-box",
  WebkitBoxOrient: "vertical" as const,
  overflow: "hidden",
};

export function CollapsibleDescription({ text, maxLines = 10 }: Props) {
  const t = useTranslations("Common");
  const ref = useRef<HTMLParagraphElement>(null);
  const [isClamped, setIsClamped] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const checkClamped = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setIsClamped(el.scrollHeight > el.clientHeight + 1);
  }, []);

  useEffect(() => {
    checkClamped();
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(checkClamped);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, maxLines, checkClamped]);

  return (
    <div>
      <p
        ref={ref}
        className="text-sm leading-relaxed whitespace-pre-wrap"
        style={expanded ? undefined : { ...clampBase, WebkitLineClamp: maxLines }}
      >
        {linkifyText(text)}
      </p>
      {(isClamped || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-primary mt-2 inline-flex cursor-pointer items-center gap-1 text-sm hover:underline"
        >
          {expanded ? (
            <>
              {t("showLess")}
              <ChevronUp className="size-3.5" />
            </>
          ) : (
            <>
              {t("showMore")}
              <ChevronDown className="size-3.5" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
