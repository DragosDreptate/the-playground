"use client";

import { Download, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Dialog as DialogPrimitive } from "radix-ui";
import type { MomentAttachment } from "@/domain/models/moment-attachment";
import { cn } from "@/lib/utils";
import { formatAttachmentSize, formatAttachmentType } from "./attachment-format";

type AttachmentViewerDialogProps = {
  attachment: MomentAttachment | null;
  momentSlug: string;
  onClose: () => void;
};

/**
 * Full-screen modal that displays a PDF (via iframe, using browser's native
 * renderer) or an image (via <img>). Includes a download button that hits the
 * server proxy route (forces Content-Disposition: attachment).
 */
export function AttachmentViewerDialog({
  attachment,
  momentSlug,
  onClose,
}: AttachmentViewerDialogProps) {
  const t = useTranslations("Moment.public.attachments");

  const isOpen = attachment !== null;
  const isImage = attachment?.contentType.startsWith("image/") ?? false;
  const isPdf = attachment?.contentType === "application/pdf";

  const downloadHref = attachment
    ? `/api/moments/${momentSlug}/attachments/${attachment.id}/download`
    : "#";

  return (
    <DialogPrimitive.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/85" />
        <DialogPrimitive.Content
          className={cn(
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "fixed top-1/2 left-1/2 z-50 flex w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col",
            "h-[calc(100vh-4rem)] max-h-[900px] max-w-4xl",
            "bg-card border-border overflow-hidden rounded-xl border shadow-2xl outline-none"
          )}
        >
          {/* Header */}
          <div className="border-border flex items-start gap-3 border-b p-4">
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="text-foreground truncate text-sm font-semibold">
                {attachment?.filename}
              </DialogPrimitive.Title>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {attachment
                  ? `${formatAttachmentType(attachment.contentType)} · ${formatAttachmentSize(attachment.sizeBytes)}`
                  : ""}
              </p>
            </div>
            <DialogPrimitive.Description className="sr-only">
              {attachment?.filename}
            </DialogPrimitive.Description>
            <div className="flex shrink-0 gap-1.5">
              <a
                href={downloadHref}
                className="border-border hover:bg-muted hover:border-primary flex size-9 items-center justify-center rounded-lg border transition-colors"
                aria-label={t("viewerDownload")}
                download
              >
                <Download className="size-4" />
              </a>
              <DialogPrimitive.Close
                className="border-border hover:bg-muted hover:border-primary flex size-9 items-center justify-center rounded-lg border transition-colors"
                aria-label={t("viewerClose")}
              >
                <X className="size-4" />
              </DialogPrimitive.Close>
            </div>
          </div>

          {/* Body */}
          <div className="bg-background flex min-h-0 flex-1 items-center justify-center overflow-hidden">
            {isImage && attachment && (
              <img
                src={attachment.url}
                alt={attachment.filename}
                className="max-h-full max-w-full object-contain"
              />
            )}
            {isPdf && attachment && (
              <iframe
                src={attachment.url}
                className="size-full border-0"
                title={attachment.filename}
              />
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
