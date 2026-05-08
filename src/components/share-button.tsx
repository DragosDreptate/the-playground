"use client";

import { useEffect, useState } from "react";

import { isShareSupported, tryShare } from "@/lib/share";

type ShareButtonProps = {
  url: string;
  ariaLabel: string;
  onShared?: () => void;
};

export function ShareButton({ url, ariaLabel, onShared }: ShareButtonProps) {
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(isShareSupported());
  }, []);

  if (!canShare) return null;

  async function handleClick() {
    const outcome = await tryShare(url);
    if (outcome === "shared") onShared?.();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel}
      className="absolute top-3 right-3 z-10 flex size-9 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur-sm transition-transform hover:scale-105 hover:bg-black/60 active:scale-95 lg:hidden"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-[17px] -translate-y-px"
      >
        <path d="M12 3v13" />
        <path d="M16 7l-4-4-4 4" />
        <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5" />
      </svg>
    </button>
  );
}
