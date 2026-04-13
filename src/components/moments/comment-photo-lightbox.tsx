"use client";

import { ExternalLink, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Dialog as DialogPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

type CommentPhotoLightboxProps = {
  url: string | null;
  alt: string;
  onClose: () => void;
};

export function CommentPhotoLightbox({
  url,
  alt,
  onClose,
}: CommentPhotoLightboxProps) {
  const t = useTranslations("Common");

  return (
    <DialogPrimitive.Root
      open={url !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/85" />
        <DialogPrimitive.Content
          className={cn(
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "fixed top-1/2 left-1/2 z-50 flex w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center",
            "h-[calc(100vh-4rem)] max-h-[900px] max-w-4xl",
            "outline-none"
          )}
        >
          <DialogPrimitive.Title className="sr-only">{alt}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            {alt}
          </DialogPrimitive.Description>

          {/* Action buttons — top right */}
          <div className="absolute top-0 right-0 z-10 flex gap-1.5">
            {/* Open in new tab — pinch-to-zoom works natively in
                the browser's full-screen image viewer, unlike inside
                a modal where touch events are intercepted. */}
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-9 items-center justify-center rounded-lg border border-white/12 bg-white/6 text-gray-300 transition-colors hover:border-white/20 hover:bg-white/12 hover:text-white"
                aria-label={t("openInNewTab")}
              >
                <ExternalLink className="size-4" />
              </a>
            )}
            <DialogPrimitive.Close
              className="flex size-9 items-center justify-center rounded-lg border border-white/12 bg-white/6 text-gray-300 transition-colors hover:border-white/20 hover:bg-white/12 hover:text-white"
              aria-label={t("close")}
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>

          {/* Image */}
          {url && (
            <img
              src={url}
              alt={alt}
              className="max-h-full max-w-full rounded-md object-contain"
            />
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
