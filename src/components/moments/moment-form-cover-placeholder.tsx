"use client";

import { Camera } from "lucide-react";

export function MomentFormCoverPlaceholder() {
  return (
    <div className="bg-muted/50 relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl lg:aspect-auto lg:h-full">
      {/* Gradient overlay */}
      <div className="from-primary/10 via-primary/5 absolute inset-0 bg-gradient-to-br to-transparent" />
      <div className="relative flex flex-col items-center gap-3 text-center">
        <div className="bg-muted flex size-14 items-center justify-center rounded-full">
          <Camera className="text-muted-foreground size-6" />
        </div>
      </div>
    </div>
  );
}
