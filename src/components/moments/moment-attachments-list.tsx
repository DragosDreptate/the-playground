"use client";

import { useState } from "react";
import { ChevronRight, FileText, ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MomentAttachment } from "@/domain/models/moment-attachment";
import { AttachmentViewerDialog } from "./attachment-viewer-dialog";
import {
  formatAttachmentName,
  formatAttachmentSize,
  formatAttachmentType,
} from "./attachment-format";

type MomentAttachmentsListProps = {
  attachments: MomentAttachment[];
  momentSlug: string;
};

/**
 * Public-facing list of attachments on the Moment page.
 * Unified card treatment for PDFs and images. Click opens the viewer modal.
 */
export function MomentAttachmentsList({
  attachments,
  momentSlug,
}: MomentAttachmentsListProps) {
  const t = useTranslations("Moment.public.attachments");
  const [openAttachment, setOpenAttachment] = useState<MomentAttachment | null>(
    null
  );

  if (attachments.length === 0) return null;

  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          {t("sectionTitle")}
        </h2>

        <ul role="list" className="flex flex-col gap-2">
          {attachments.map((attachment) => {
            const isImage = attachment.contentType.startsWith("image/");
            const Icon = isImage ? ImageIcon : FileText;
            return (
              <li key={attachment.id} role="listitem">
                <button
                  type="button"
                  onClick={() => setOpenAttachment(attachment)}
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
