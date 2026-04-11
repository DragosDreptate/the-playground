"use client";

import { useCallback, useState } from "react";
import { ChevronRight, FileText, ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MomentAttachment } from "@/domain/models/moment-attachment";
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
 * Detects touch-first devices (phones, tablets) at click time.
 * `(pointer: coarse)` is the standard media query for coarse pointers
 * like fingers (vs. `fine` for mouse/trackpad).
 *
 * Runs only in the browser — always returns false during SSR/first
 * render, avoiding hydration mismatch. This is fine because the only
 * place we call it is inside a click handler, which by definition runs
 * on the client.
 */
function isCoarsePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

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
      <section className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          {t("sectionTitle")}
        </h2>

        <ul role="list" className="flex flex-col gap-2">
          {attachments.map((attachment) => {
            const Icon = isImageAttachment(attachment.contentType) ? ImageIcon : FileText;
            return (
              <li key={attachment.id} role="listitem">
                <button
                  type="button"
                  onClick={() => handleCardClick(attachment)}
                  className="border-border bg-card hover:bg-muted hover:border-primary/20 flex min-h-14 w-full items-center gap-3.5 rounded-lg border px-4 py-3 text-left transition-colors"
                >
                  <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate text-sm font-medium">
                      {formatAttachmentName(attachment.filename)}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {formatAttachmentType(attachment.contentType)} ·{" "}
                      {formatAttachmentSize(attachment.sizeBytes)}
                    </p>
                  </div>
                  <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <AttachmentViewerDialog
        attachment={openAttachment}
        momentSlug={momentSlug}
        onClose={() => setOpenAttachment(null)}
      />
    </>
  );
}
