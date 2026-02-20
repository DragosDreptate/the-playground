"use client";

import { Camera } from "lucide-react";
import { getMomentGradient } from "@/lib/gradient";

type MomentFormCoverPlaceholderProps = {
  seed?: string;
};

export function MomentFormCoverPlaceholder({ seed = "" }: MomentFormCoverPlaceholderProps) {
  const gradient = getMomentGradient(seed);

  return (
    <div
      className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl"
      style={{ background: gradient }}
    >
      <div className="absolute inset-0 bg-black/20" />
      <div className="relative flex flex-col items-center gap-3 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
          <Camera className="size-6 text-white" />
        </div>
      </div>
    </div>
  );
}
