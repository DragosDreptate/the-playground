"use client";

import type { ReactNode } from "react";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  FileText,
  ImageIcon,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { MomentAttachment } from "@/domain/models/moment-attachment";
import {
  ALLOWED_ATTACHMENT_CONTENT_TYPES,
  MAX_ATTACHMENT_SIZE_BYTES,
  MAX_ATTACHMENTS_PER_MOMENT,
} from "@/domain/models/moment-attachment";
import {
  deleteMomentAttachmentAction,
  uploadMomentAttachmentAction,
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
import {
  formatAttachmentSize,
  isImageAttachment,
} from "./attachment-format";

type StagedFile = { tempId: string; file: File; error?: string };
type UploadingFile = {
  tempId: string;
  filename: string;
  sizeBytes: number;
  contentType: string;
  error?: string;
};

type MomentAttachmentsEditorProps = {
  /** Null during creation (staged mode), set when editing an existing moment (live mode). */
  momentId: string | null;
  initialAttachments?: MomentAttachment[];
};

export type MomentAttachmentsEditorHandle = {
  /** Upload every staged file to the newly-created moment. Resolves with the error count. */
  flushStaged(momentId: string): Promise<{ failedCount: number }>;
  hasStagedFiles(): boolean;
};

const MAX_MB = MAX_ATTACHMENT_SIZE_BYTES / 1024 / 1024;
const ACCEPT = Array.from(ALLOWED_ATTACHMENT_CONTENT_TYPES).join(",");

function newTempId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random()}`;
}

/**
 * Two modes, picked by `momentId`:
 * - **Staged** (create): files stay in browser memory until the parent
 *   calls `flushStaged(newMomentId)` via ref after the moment is created.
 * - **Live** (edit): each dropped file is uploaded immediately.
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
        const tempId = newTempId();
        const clientError = clientValidate(file);

        if (!isLiveMode) {
          setStaged((prev) => [
            ...prev,
            { tempId, file, error: clientError ?? undefined },
          ]);
          continue;
        }

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

  useImperativeHandle(
    ref,
    () => ({
      async flushStaged(newMomentId: string): Promise<{ failedCount: number }> {
        const filesToUpload = staged.filter((s) => !s.error);
        if (filesToUpload.length === 0) return { failedCount: 0 };

        // Move staged files to the uploading state immediately so the user
        // sees progress cards instead of a silent wait during the flush.
        const uploadingEntries: UploadingFile[] = filesToUpload.map((s) => ({
          tempId: s.tempId,
          filename: s.file.name,
          sizeBytes: s.file.size,
          contentType: s.file.type,
        }));
        setStaged([]);
        setUploading(uploadingEntries);

        let failedCount = 0;

        await Promise.all(
          filesToUpload.map(async (stagedFile) => {
            const formData = new FormData();
            formData.append("file", stagedFile.file);
            const result = await uploadMomentAttachmentAction(
              newMomentId,
              formData
            );
            if (result.success) {
              setAttachments((prev) => [...prev, result.data]);
              setUploading((prev) =>
                prev.filter((u) => u.tempId !== stagedFile.tempId)
              );
            } else {
              failedCount += 1;
              setUploading((prev) =>
                prev.map((u) =>
                  u.tempId === stagedFile.tempId
                    ? { ...u, error: result.error }
                    : u
                )
              );
            }
          })
        );

        return { failedCount };
      },
      hasStagedFiles() {
        return staged.some((s) => !s.error);
      },
    }),
    [staged]
  );

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
  const removeAriaLabel = t("deleteConfirmAction");

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

      {!isEmpty && (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={`space-y-2 ${isDragging ? "ring-primary rounded-lg ring-2" : ""}`}
        >
          {attachments.map((a) => (
            <AttachmentCard
              key={a.id}
              icon={isImageAttachment(a.contentType) ? ImageIcon : FileText}
              filename={a.filename}
              subtitle={formatAttachmentSize(a.sizeBytes)}
              onRemove={() => setPendingDelete(a)}
              removeAriaLabel={removeAriaLabel}
            />
          ))}

          {staged.map((s) => (
            <AttachmentCard
              key={s.tempId}
              icon={
                s.error
                  ? AlertCircle
                  : isImageAttachment(s.file.type)
                    ? ImageIcon
                    : FileText
              }
              filename={s.file.name}
              subtitle={
                s.error ? (
                  <span className="text-destructive">{s.error}</span>
                ) : (
                  formatAttachmentSize(s.file.size)
                )
              }
              hasError={!!s.error}
              onRemove={() => onRemoveStaged(s.tempId)}
              removeAriaLabel={removeAriaLabel}
            />
          ))}

          {uploading.map((u) => (
            <AttachmentCard
              key={u.tempId}
              icon={
                u.error
                  ? AlertCircle
                  : isImageAttachment(u.contentType)
                    ? ImageIcon
                    : FileText
              }
              filename={u.filename}
              subtitle={
                u.error ? (
                  <span className="text-destructive">{u.error}</span>
                ) : (
                  <>
                    <span className="bg-border mt-1.5 block h-1 overflow-hidden rounded-full">
                      <span className="bg-primary block h-full w-1/2 animate-pulse" />
                    </span>
                    <span className="mt-1 block">
                      {t("uploading")} · {formatAttachmentSize(u.sizeBytes)}
                    </span>
                  </>
                )
              }
              hasError={!!u.error}
              onRemove={() => onCancelUpload(u.tempId)}
              removeAriaLabel={removeAriaLabel}
            />
          ))}

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
        data-testid="moment-attachments-file-input"
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

type AttachmentCardProps = {
  icon: LucideIcon;
  filename: string;
  subtitle: ReactNode;
  hasError?: boolean;
  onRemove: () => void;
  removeAriaLabel: string;
};

function AttachmentCard({
  icon: Icon,
  filename,
  subtitle,
  hasError = false,
  onRemove,
  removeAriaLabel,
}: AttachmentCardProps) {
  return (
    <div
      className={`flex min-h-14 items-center gap-3 rounded-lg border px-4 py-3 ${
        hasError
          ? "border-destructive/30 bg-destructive/5"
          : "border-border bg-muted"
      }`}
    >
      <div
        className={`flex size-8 shrink-0 items-center justify-center ${
          hasError ? "text-destructive" : "text-muted-foreground"
        }`}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate text-sm font-medium">{filename}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">{subtitle}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="hover:bg-destructive/10 hover:text-destructive text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded transition-colors"
        aria-label={removeAriaLabel}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
