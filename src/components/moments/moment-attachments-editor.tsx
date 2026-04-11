"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { FileText, ImageIcon, Upload, X, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MomentAttachment } from "@/domain/models/moment-attachment";
import {
  MAX_ATTACHMENTS_PER_MOMENT,
  MAX_ATTACHMENT_SIZE_BYTES,
  ALLOWED_ATTACHMENT_CONTENT_TYPES,
} from "@/domain/models/moment-attachment";
import {
  uploadMomentAttachmentAction,
  deleteMomentAttachmentAction,
} from "@/app/actions/moment-attachments";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatAttachmentSize } from "./attachment-format";

/** Local file held in the staging list (create mode — moment doesn't exist yet). */
type StagedFile = {
  tempId: string;
  file: File;
  error?: string;
};

/** Upload in progress (live mode — moment exists, upload fired). */
type UploadingFile = {
  tempId: string;
  filename: string;
  sizeBytes: number;
  contentType: string;
  error?: string;
};

type MomentAttachmentsEditorProps = {
  /** Moment ID if editing an existing moment (live mode). Null during creation (staged mode). */
  momentId: string | null;
  initialAttachments?: MomentAttachment[];
};

export type MomentAttachmentsEditorHandle = {
  /**
   * In staged mode: uploads all staged files to the newly-created moment.
   * Resolves once all uploads complete (success or error).
   * Returns the number of files that failed to upload.
   */
  flushStaged(momentId: string): Promise<{ failedCount: number }>;
  hasStagedFiles(): boolean;
};

const MAX_MB = MAX_ATTACHMENT_SIZE_BYTES / 1024 / 1024;
const ACCEPT = Array.from(ALLOWED_ATTACHMENT_CONTENT_TYPES).join(",");

/**
 * Attachments editor displayed in the Moment form.
 *
 * Two modes:
 * - **Staged mode** (create): moment doesn't exist yet. Files are held in
 *   browser memory as File objects, no upload happens. After the moment is
 *   created, the parent calls `flushStaged(momentId)` via ref to upload them.
 * - **Live mode** (edit): moment exists. Each dropped/picked file is uploaded
 *   immediately via server action.
 */
export const MomentAttachmentsEditor = forwardRef<
  MomentAttachmentsEditorHandle,
  MomentAttachmentsEditorProps
>(function MomentAttachmentsEditor({ momentId, initialAttachments = [] }, ref) {
  const t = useTranslations("Moment.form.attachments");
  const isLiveMode = momentId !== null;

  const [attachments, setAttachments] =
    useState<MomentAttachment[]>(initialAttachments);
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<MomentAttachment | null>(
    null
  );
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalCount =
    attachments.length +
    staged.filter((s) => !s.error).length +
    uploading.filter((u) => !u.error).length;
  const canAddMore = totalCount < MAX_ATTACHMENTS_PER_MOMENT;

  const clientValidate = useCallback(
    (file: File): string | null => {
      if (!ALLOWED_ATTACHMENT_CONTENT_TYPES.has(file.type)) {
        return t("errorTypeNotAllowed");
      }
      if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        return t("errorTooLarge", { max: MAX_MB });
      }
      return null;
    },
    [t]
  );

  // ── File intake (both modes) ─────────────────────────────
  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setGlobalError(null);
      const fileArray = Array.from(files);
      const remainingSlots = MAX_ATTACHMENTS_PER_MOMENT - totalCount;

      if (remainingSlots <= 0) {
        setGlobalError(t("errorLimitReached", { max: MAX_ATTACHMENTS_PER_MOMENT }));
        return;
      }

      const toProcess = fileArray.slice(0, remainingSlots);
      if (fileArray.length > remainingSlots) {
        setGlobalError(t("errorLimitReached", { max: MAX_ATTACHMENTS_PER_MOMENT }));
      }

      for (const file of toProcess) {
        const tempId = `${file.name}-${Date.now()}-${Math.random()}`;
        const clientError = clientValidate(file);

        // Staged mode: just add to the local list (no upload yet)
        if (!isLiveMode) {
          setStaged((prev) => [
            ...prev,
            {
              tempId,
              file,
              error: clientError ?? undefined,
            },
          ]);
          continue;
        }

        // Live mode: upload immediately
        if (clientError) {
          setUploading((prev) => [
            ...prev,
            {
              tempId,
              filename: file.name,
              sizeBytes: file.size,
              contentType: file.type,
              error: clientError,
            },
          ]);
          continue;
        }

        setUploading((prev) => [
          ...prev,
          {
            tempId,
            filename: file.name,
            sizeBytes: file.size,
            contentType: file.type,
          },
        ]);

        const formData = new FormData();
        formData.append("file", file);
        const result = await uploadMomentAttachmentAction(momentId!, formData);

        if (result.success) {
          setAttachments((prev) => [...prev, result.data]);
          setUploading((prev) => prev.filter((u) => u.tempId !== tempId));
        } else {
          setUploading((prev) =>
            prev.map((u) =>
              u.tempId === tempId ? { ...u, error: result.error } : u
            )
          );
        }
      }
    },
    [clientValidate, isLiveMode, momentId, t, totalCount]
  );

  // ── Imperative handle: flushStaged (called by parent after create) ───
  useImperativeHandle(
    ref,
    () => ({
      async flushStaged(newMomentId: string): Promise<{ failedCount: number }> {
        const filesToUpload = staged.filter((s) => !s.error);
        let failedCount = 0;

        for (const stagedFile of filesToUpload) {
          const formData = new FormData();
          formData.append("file", stagedFile.file);
          const result = await uploadMomentAttachmentAction(newMomentId, formData);
          if (!result.success) {
            failedCount += 1;
          }
        }

        // Clear staged files after flush (success or not — the parent decides
        // what to do next based on failedCount)
        setStaged([]);
        return { failedCount };
      },
      hasStagedFiles() {
        return staged.some((s) => !s.error);
      },
    }),
    [staged]
  );

  // ── Drag & drop handlers ─────────────────────────────────
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (!canAddMore) return;
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [canAddMore, handleFiles]
  );

  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (canAddMore) setIsDragging(true);
    },
    [canAddMore]
  );

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onPickerChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
        e.target.value = "";
      }
    },
    [handleFiles]
  );

  // ── Delete / remove handlers ─────────────────────────────
  const onConfirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setPendingDelete(null);
    const result = await deleteMomentAttachmentAction(id);
    if (result.success) {
      setAttachments((prev) => prev.filter((a) => a.id !== id));
    } else {
      setGlobalError(result.error);
    }
  }, [pendingDelete]);

  const onRemoveStaged = useCallback((tempId: string) => {
    setStaged((prev) => prev.filter((s) => s.tempId !== tempId));
  }, []);

  const onCancelUpload = useCallback((tempId: string) => {
    setUploading((prev) => prev.filter((u) => u.tempId !== tempId));
  }, []);

  const isEmpty =
    attachments.length === 0 && staged.length === 0 && uploading.length === 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground px-1 text-xs font-medium uppercase tracking-wider">
          {t("label")}
        </p>
        <span className="text-muted-foreground text-xs">
          {t("count", { count: totalCount, max: MAX_ATTACHMENTS_PER_MOMENT })}
        </span>
      </div>

      {/* Dropzone — only when empty */}
      {isEmpty && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={`border-border bg-muted hover:border-primary hover:bg-primary/5 flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-9 text-center transition-colors ${
            isDragging ? "border-primary bg-primary/5" : ""
          }`}
        >
          <Upload className="text-muted-foreground size-9" />
          <p className="text-foreground text-sm font-medium">
            {t("dropzoneTitle")}
          </p>
          <p className="text-muted-foreground text-xs">{t("dropzoneSeparator")}</p>
          <span className="border-border bg-card text-foreground rounded-md border px-3 py-1.5 text-xs font-medium">
            {t("dropzoneBrowse")}
          </span>
          <p className="text-muted-foreground mt-1 text-xs">
            {t("dropzoneHint", { max: MAX_MB })}
          </p>
        </button>
      )}

      {/* Cards list */}
      {!isEmpty && (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={`space-y-2 ${isDragging ? "ring-primary rounded-lg ring-2" : ""}`}
        >
          {/* Persistent attachments (live mode) */}
          {attachments.map((a) => {
            const isImage = a.contentType.startsWith("image/");
            const Icon = isImage ? ImageIcon : FileText;
            return (
              <div
                key={a.id}
                className="border-border bg-muted flex min-h-14 items-center gap-3 rounded-lg border px-4 py-3"
              >
                <div className="text-muted-foreground flex size-8 shrink-0 items-center justify-center">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground truncate text-sm font-medium">
                    {a.filename}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {formatAttachmentSize(a.sizeBytes)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingDelete(a)}
                  className="hover:bg-destructive/10 hover:text-destructive text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded transition-colors"
                  aria-label={t("deleteConfirmAction")}
                >
                  <X className="size-4" />
                </button>
              </div>
            );
          })}

          {/* Staged files (create mode — not yet uploaded) */}
          {staged.map((s) => {
            const isImage = s.file.type.startsWith("image/");
            const Icon = s.error ? AlertCircle : isImage ? ImageIcon : FileText;
            return (
              <div
                key={s.tempId}
                className={`flex min-h-14 items-center gap-3 rounded-lg border px-4 py-3 ${
                  s.error
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-border bg-muted"
                }`}
              >
                <div
                  className={`flex size-8 shrink-0 items-center justify-center ${
                    s.error ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground truncate text-sm font-medium">
                    {s.file.name}
                  </p>
                  {s.error ? (
                    <p className="text-destructive mt-0.5 text-xs">{s.error}</p>
                  ) : (
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {formatAttachmentSize(s.file.size)}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveStaged(s.tempId)}
                  className="hover:bg-destructive/10 hover:text-destructive text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded transition-colors"
                  aria-label={t("deleteConfirmAction")}
                >
                  <X className="size-4" />
                </button>
              </div>
            );
          })}

          {/* In-progress uploads (live mode) */}
          {uploading.map((u) => {
            const isImage = u.contentType.startsWith("image/");
            const Icon = u.error ? AlertCircle : isImage ? ImageIcon : FileText;
            return (
              <div
                key={u.tempId}
                className={`flex min-h-14 items-center gap-3 rounded-lg border px-4 py-3 ${
                  u.error
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-border bg-muted"
                }`}
              >
                <div
                  className={`flex size-8 shrink-0 items-center justify-center ${
                    u.error ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground truncate text-sm font-medium">
                    {u.filename}
                  </p>
                  {u.error ? (
                    <p className="text-destructive mt-0.5 text-xs">{u.error}</p>
                  ) : (
                    <>
                      <div className="bg-border mt-1.5 h-1 overflow-hidden rounded-full">
                        <div className="bg-primary h-full w-1/2 animate-pulse" />
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {t("uploading")} · {formatAttachmentSize(u.sizeBytes)}
                      </p>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onCancelUpload(u.tempId)}
                  className="hover:bg-destructive/10 hover:text-destructive text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded transition-colors"
                  aria-label={t("deleteConfirmAction")}
                >
                  <X className="size-4" />
                </button>
              </div>
            );
          })}

          {canAddMore && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="border-border text-muted-foreground hover:border-primary hover:text-primary w-full rounded-lg border border-dashed py-3 text-sm font-medium transition-colors"
            >
              + {t("addMore")}
            </button>
          )}
        </div>
      )}

      {globalError && (
        <p className="text-destructive text-xs">{globalError}</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        multiple
        onChange={onPickerChange}
        className="hidden"
      />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("deleteConfirmCancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {t("deleteConfirmAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});
