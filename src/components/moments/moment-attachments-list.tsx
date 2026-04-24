"use client";

import { useCallback, useState } from "react";
import { ChevronRight, FileText, ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MomentAttachment } from "@/domain/models/moment-attachment";
import { isCoarsePointer } from "@/lib/coarse-pointer";
import { AttachmentViewerDialog } from "./attachment-viewer-dialog";
import {
  formatAttachmentName,
  formatAttachmentSize,
  formatAttachmentType,
  isImageAttachment,
} from "./attachment-format";

type MomentAttachmentsListProps = {
  attachments: MomentAttachment[];
  momentSlug: string;
};

/**
 * Public-facing list of attachments on the Moment page.
 *
 * Click behavior differs by device:
 * - **Touch device (mobile, tablet)**: opens the file directly in a new
 *   browser tab. The native full-screen reader (iOS Quick Look, Android
 *   PDF viewer, image viewer) has proper pinch-to-zoom and orientation
 *   handling. In PWA standalone mode, the file opens in the system
 *   browser — the user leaves the PWA temporarily, then returns via
 *   task switching. Acceptable trade-off vs. embedding pdf.js + a zoom
 *   library (~400 KB).
 * - **Desktop (fine pointer)**: opens the in-page viewer modal with
 *   inline preview (iframe for PDFs, <img> for images). Users can still
 *   open in a new tab from the modal if they want zoom or printing.
 */
export function MomentAttachmentsList({
  attachments,
  momentSlug,
}: MomentAttachmentsListProps) {
  const t = useTranslations("Moment.public.attachments");
  const [openAttachment, setOpenAttachment] = useState<MomentAttachment | null>(
    null
  );

  const handleCardClick = useCallback((attachment: MomentAttachment) => {
    if (isCoarsePointer()) {
      window.open(attachment.url, "_blank", "noopener,noreferrer");
      return;
    }
    setOpenAttachment(attachment);
  }, []);

  if (attachments.length === 0) return null;

  return (
    <>
      <div className="border-border bg-card rounded-2xl border p-6">
        <h2 className="text-muted-foreground mb-4 text-xs font-semibold uppercase tracking-wider">
          {t("sectionTitle")}
        </h2>
        <div className="divide-border divide-y">
          {attachments.map((attachment) => {
            const Icon = isImageAttachment(attachment.contentType) ? ImageIcon : FileText;
            return (
              <button
                key={attachment.id}
                type="button"
                onClick={() => handleCardClick(attachment)}
                className="hover:bg-muted/50 -mx-2 flex w-[calc(100%+1rem)] cursor-pointer items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors"
              >
                <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground truncate text-sm font-semibold">
                    {formatAttachmentName(attachment.filename)}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {formatAttachmentType(attachment.contentType)} ·{" "}
                    {formatAttachmentSize(attachment.sizeBytes)}
                  </p>
                </div>
                <ChevronRight className="text-muted-foreground size-4 shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      <AttachmentViewerDialog
        attachment={openAttachment}
        momentSlug={momentSlug}
        onClose={() => setOpenAttachment(null)}
      />
    </>
  );
}
