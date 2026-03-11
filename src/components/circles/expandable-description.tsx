"use client";

import { useState } from "react";

const MAX_CHARS = 600;
const MAX_LINES = 10;

function needsTruncation(text: string): boolean {
  return text.length > MAX_CHARS || text.split("\n").length > MAX_LINES;
}

function truncate(text: string): string {
  const byLines = text.split("\n").slice(0, MAX_LINES).join("\n");
  if (byLines.length <= MAX_CHARS) return byLines;
  return byLines.slice(0, MAX_CHARS);
}

export function ExpandableDescription({
  description,
  seeMoreLabel = "Voir plus",
  seeLessLabel = "Voir moins",
}: {
  description: string;
  seeMoreLabel?: string;
  seeLessLabel?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const truncatable = needsTruncation(description);

  const displayed = !truncatable || expanded ? description : truncate(description);

  return (
    <div>
      <p className="text-sm leading-relaxed whitespace-pre-wrap">
        {displayed}
        {truncatable && !expanded && "…"}
      </p>
      {truncatable && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-primary mt-1 text-sm font-medium hover:underline"
        >
          {expanded ? seeLessLabel : seeMoreLabel}
        </button>
      )}
    </div>
  );
}
