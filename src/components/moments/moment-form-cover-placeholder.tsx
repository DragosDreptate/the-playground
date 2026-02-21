"use client";

import { Camera } from "lucide-react";
import { getMomentGradient } from "@/lib/gradient";

type MomentFormCoverPlaceholderProps = {
  seed?: string;
};

export function MomentFormCoverPlaceholder({ seed = "" }: MomentFormCoverPlaceholderProps) {
  const gradient = getMomentGradient(seed);

  return (
    <div className="relative">
      <div
        className="absolute inset-x-4 -bottom-3 h-10 opacity-60 blur-xl"
        style={{ background: gradient }}
      />
      <div
        className="relative w-full overflow-hidden rounded-2xl"
        style={{ background: gradient, aspectRatio: "1 / 1" }}
      >
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <Camera className="size-6 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
