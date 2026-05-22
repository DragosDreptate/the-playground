"use client";

import { useEffect, useRef } from "react";
import { EMBED_HEIGHT_MESSAGE_TYPE } from "@/components/embed/constants";

export function EmbedHeightReporter() {
  const lastSentHeight = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) return;

    const send = () => {
      const height = Math.round(document.documentElement.scrollHeight);
      if (height === lastSentHeight.current) return;
      lastSentHeight.current = height;
      window.parent.postMessage(
        { type: EMBED_HEIGHT_MESSAGE_TYPE, height },
        "*"
      );
    };

    const observer = new ResizeObserver(send);
    observer.observe(document.documentElement);

    return () => observer.disconnect();
  }, []);

  return null;
}
