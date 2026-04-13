"use client";

import { useState, useTransition, useRef, useCallback, useEffect } from "react";
import posthog from "posthog-js";
import { useTranslations } from "next-intl";
import { ImagePlus, X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { CommentPhotoLightbox } from "@/components/moments/comment-photo-lightbox";
import { addCommentAction, deleteCommentAction } from "@/app/actions/comment";
import { compressCommentPhoto } from "@/lib/image-compress";
import { isCoarsePointer } from "@/lib/coarse-pointer";
import { getDisplayName } from "@/lib/display-name";
import { linkifyText } from "@/lib/linkify";
import {
  MAX_COMMENT_PHOTOS,
  ALLOWED_COMMENT_PHOTO_TYPES,
} from "@/domain/models/comment-attachment";
import type { CommentWithUser } from "@/domain/models/comment";

const MAX_CONTENT_LENGTH = 2000;

type StagedPhoto = {
  file: File;
  previewUrl: string;
  compressed: Blob | null; // null = not yet compressed
};

type CommentThreadProps = {
  momentId: string;
  comments: CommentWithUser[];
  currentUserId: string | null;
  isHost: boolean;
  isPastMoment: boolean;
  signInUrl: string;
};

function useRelativeTime(t: ReturnType<typeof useTranslations>) {
  return function formatRelativeTime(date: Date): string {
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60_000);
    if (diffMinutes < 1) return t("comments.justNow");
    if (diffMinutes < 60) return t("comments.minutesAgo", { count: diffMinutes });
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return t("comments.hoursAgo", { count: diffHours });
    const diffDays = Math.floor(diffHours / 24);
    return t("comments.daysAgo", { count: diffDays });
  };
}

function DeleteCommentButton({
  commentId,
  t,
  tCommon,
}: {
  commentId: string;
  t: ReturnType<typeof useTranslations>;
  tCommon: ReturnType<typeof useTranslations>;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setIsPending(true);
    setError(null);
    const result = await deleteCommentAction(commentId);
    if (result.success) {
      router.refresh();
    } else {
      setError(result.error);
      setIsPending(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className="text-muted-foreground hover:text-destructive cursor-pointer text-xs transition-colors">
          {tCommon("delete")}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("comments.deleteTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("comments.deleteDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
            {error}
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isPending ? tCommon("loading") : t("comments.confirmDelete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// --- Comment photos display ---

function CommentPhotos({
  attachments,
  onPhotoClick,
}: {
  attachments: CommentWithUser["attachments"];
  onPhotoClick: (url: string, alt: string) => void;
}) {
  if (attachments.length === 0) return null;

  const isSingle = attachments.length === 1;

  function handleClick(url: string, altText: string) {
    if (isCoarsePointer()) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    onPhotoClick(url, altText);
  }

  return (
    <div className={isSingle ? "mt-2" : "mt-2 flex flex-wrap gap-2"}>
      {attachments.map((att) => {
        const alt = att.filename.replace(/\.[^.]+$/, "");
        return (
          <button
            key={att.id}
            type="button"
            onClick={() => handleClick(att.url, alt)}
            className={
              isSingle
                ? "block max-w-xs cursor-pointer overflow-hidden rounded-lg ring-2 ring-transparent transition-all hover:opacity-90 hover:ring-primary/30"
                : "size-24 cursor-pointer overflow-hidden rounded-lg ring-2 ring-transparent transition-all hover:opacity-90 hover:ring-primary/30 sm:size-32"
            }
          >
            <img
              src={att.url}
              alt={alt}
              className={
                isSingle
                  ? "max-h-60 max-w-xs rounded-lg object-cover"
                  : "size-full object-cover"
              }
            />
          </button>
        );
      })}
    </div>
  );
}

// --- Main component ---

export function CommentThread({
  momentId,
  comments,
  currentUserId,
  isHost,
  isPastMoment,
  signInUrl,
}: CommentThreadProps) {
  const t = useTranslations("Moment");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formatRelativeTime = useRelativeTime(t);

  // Photo state
  const [stagedPhotos, setStagedPhotos] = useState<StagedPhoto[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Lightbox state
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxAlt, setLightboxAlt] = useState("");

  // Cleanup preview URLs on unmount to avoid memory leaks
  const stagedPhotosRef = useRef(stagedPhotos);
  stagedPhotosRef.current = stagedPhotos;
  useEffect(() => {
    return () => {
      stagedPhotosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, []);

  const isAuthenticated = currentUserId !== null;
  const photosAtLimit = stagedPhotos.length >= MAX_COMMENT_PHOTOS;

  const handlePhotoSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      setPhotoError(null);
      const files = e.target.files;
      if (!files) return;

      const remaining = MAX_COMMENT_PHOTOS - stagedPhotos.length;
      const filesToAdd = Array.from(files).slice(0, remaining);

      for (const file of filesToAdd) {
        // Client-side type check
        if (!ALLOWED_COMMENT_PHOTO_TYPES.has(file.type)) {
          setPhotoError(t("comments.photoTypeError"));
          continue;
        }

        // Compress if needed, create preview
        const previewUrl = URL.createObjectURL(file);
        try {
          const compressed = await compressCommentPhoto(file);
          setStagedPhotos((prev) => [
            ...prev,
            { file, previewUrl, compressed },
          ]);
        } catch {
          URL.revokeObjectURL(previewUrl);
          setPhotoError(t("comments.photoUploadError"));
        }
      }

      // Reset input so the same file can be re-selected
      e.target.value = "";
    },
    [stagedPhotos.length, t]
  );

  const removePhoto = useCallback((index: number) => {
    setStagedPhotos((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  function handleSubmit() {
    if (!content.trim()) return;
    setError(null);
    setPhotoError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("content", content);

      // Attach compressed photos
      for (let i = 0; i < stagedPhotos.length; i++) {
        const staged = stagedPhotos[i];
        const blob = staged.compressed ?? staged.file;
        formData.set(`photo-${i}`, blob, staged.file.name);
      }

      const result = await addCommentAction(momentId, formData);
      if (result.success) {
        posthog.capture("comment_posted", {
          moment_id: momentId,
          photo_count: stagedPhotos.length,
        });
        setContent("");
        // Cleanup preview URLs
        for (const p of stagedPhotos) URL.revokeObjectURL(p.previewUrl);
        setStagedPhotos([]);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="border-border bg-card rounded-2xl border p-6">
      <div className="space-y-4">
        {/* Header */}
        <h2 className="text-lg font-semibold">
          {t("comments.title")}{" "}
          <span className="text-muted-foreground text-base font-normal">
            ({comments.length})
          </span>
        </h2>

        {/* Comment list */}
        {comments.length === 0 ? (
          <p className="text-muted-foreground py-2 text-sm">
            {t("comments.empty")}
          </p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => {
              const canDelete =
                currentUserId === comment.user.id || isHost;
              return (
                <div key={comment.id} className="flex gap-3">
                  {/* Avatar */}
                  <UserAvatar
                    name={getDisplayName(
                      comment.user.firstName,
                      comment.user.lastName,
                      comment.user.email
                    )}
                    email={comment.user.email}
                    image={comment.user.image}
                    size="sm"
                  />

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-medium">
                        {getDisplayName(
                          comment.user.firstName,
                          comment.user.lastName,
                          comment.user.email
                        )}
                      </span>
                      <span className="text-muted-foreground text-xs" suppressHydrationWarning>
                        {formatRelativeTime(comment.createdAt)}
                      </span>
                      {canDelete && (
                        <DeleteCommentButton
                          commentId={comment.id}
                          t={t}
                          tCommon={tCommon}
                        />
                      )}
                    </div>
                    <p className="mt-0.5 text-sm whitespace-pre-wrap break-words">
                      {linkifyText(comment.content)}
                    </p>

                    {/* Photos */}
                    <CommentPhotos
                      attachments={comment.attachments}
                      onPhotoClick={(url, alt) => {
                        setLightboxUrl(url);
                        setLightboxAlt(alt);
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Form or sign-in prompt */}
        {isAuthenticated ? (
          <div className="space-y-2 pt-2">
            {/* Textarea + char count in a single bordered container */}
            <div className="border-input bg-background focus-within:ring-ring focus-within:border-ring rounded-xl border focus-within:ring-2 focus-within:ring-offset-2">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={isPastMoment ? t("comments.placeholderPast") : t("comments.placeholder")}
                rows={3}
                maxLength={MAX_CONTENT_LENGTH}
                className="placeholder:text-muted-foreground w-full resize-none border-none bg-transparent px-3 pt-2 pb-0 text-sm outline-none disabled:opacity-50"
                disabled={isPending}
              />
              <div className="flex justify-end px-3 pb-1.5">
                <span className="text-muted-foreground text-[11px]">
                  {content.length} / {MAX_CONTENT_LENGTH}
                </span>
              </div>
            </div>

            {/* Photo previews */}
            {stagedPhotos.length > 0 && (
              <div className="flex gap-2 px-0.5">
                {stagedPhotos.map((staged, i) => (
                  <div
                    key={staged.previewUrl}
                    className="relative size-16 shrink-0 overflow-hidden rounded-lg sm:size-20"
                  >
                    <img
                      src={staged.previewUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-0.5 right-0.5 flex size-[18px] cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/85"
                      aria-label={t("comments.removePhoto")}
                    >
                      <X className="size-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotoSelect}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => !photosAtLimit && fileInputRef.current?.click()}
                disabled={photosAtLimit}
                aria-label={
                  photosAtLimit
                    ? t("comments.addPhotosDisabled")
                    : t("comments.addPhotos")
                }
                className="text-muted-foreground gap-1.5"
              >
                <ImagePlus className="size-4" />
                <span className="hidden sm:inline">{t("comments.addPhotos")}</span>
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isPending || content.trim().length === 0}
              >
                {t("comments.submit")}
              </Button>
            </div>
            {(error || photoError) && (
              <p className="text-destructive text-xs">{error || photoError}</p>
            )}
          </div>
        ) : (
          <a
            href={signInUrl}
            className="text-primary text-sm hover:underline"
          >
            {t("comments.signInToComment")}
          </a>
        )}
      </div>

      {/* Lightbox */}
      <CommentPhotoLightbox
        url={lightboxUrl}
        alt={lightboxAlt}
        onClose={() => setLightboxUrl(null)}
      />
    </div>
  );
}
