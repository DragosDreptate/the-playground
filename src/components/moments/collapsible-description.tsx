"use client";

import { useRef, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp } from "lucide-react";

type Props = {
  text: string;
  /** Max visible lines before collapsing (default 5) */
  maxLines?: number;
};

export function CollapsibleDescription({ text, maxLines = 5 }: Props) {
  const t = useTranslations("Common");
  const ref = useRef<HTMLParagraphElement>(null);
  const [isClamped, setIsClamped] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // scrollHeight > clientHeight means the text is overflowing the clamp
    setIsClamped(el.scrollHeight > el.clientHeight + 1);
  }, [text]);

  return (
    <div>
      <p
        ref={ref}
        className={`text-sm leading-relaxed whitespace-pre-wrap ${expanded ? "" : `line-clamp-${maxLines}`}`}
        style={expanded ? undefined : { WebkitLineClamp: maxLines, display: "-webkit-box", WebkitBoxOrient: "vertical", overflow: "hidden" }}
      >
        {text}
      </p>
      {(isClamped || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-primary mt-2 inline-flex items-center gap-1 text-sm hover:underline"
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
