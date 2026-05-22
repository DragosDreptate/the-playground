"use client";

import { useEffect } from "react";
import { EMBED_HEIGHT_MESSAGE_TYPE } from "@/components/embed/constants";

export function EmbedHeightReporter() {
  useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) return;

    const send = () => {
      window.parent.postMessage(
        {
          type: EMBED_HEIGHT_MESSAGE_TYPE,
          height: document.documentElement.scrollHeight,
        },
        "*"
      );
    };

    send();

    const observer = new ResizeObserver(send);
    observer.observe(document.documentElement);

    return () => observer.disconnect();
  }, []);

  return null;
}
