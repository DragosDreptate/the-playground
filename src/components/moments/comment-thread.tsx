"use client";

import { useState, useTransition, useRef } from "react";
import { useTranslations } from "next-intl";
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
import { getMomentGradient } from "@/lib/gradient";
import { addCommentAction, deleteCommentAction } from "@/app/actions/comment";
import type { CommentWithUser } from "@/domain/models/comment";

const MAX_CONTENT_LENGTH = 2000;

type CommentThreadProps = {
  momentId: string;
  comments: CommentWithUser[];
  currentUserId: string | null;
  isHost: boolean;
  isPastMoment: boolean;
  signInUrl: string;
};

function getInitials(
  firstName: string | null,
  lastName: string | null,
  email: string
): string {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (firstName) return firstName[0].toUpperCase();
  return email[0].toUpperCase();
}

function getDisplayName(
  firstName: string | null,
  lastName: string | null,
  email: string
): string {
  if (firstName && lastName) return `${firstName} ${lastName}`;
  if (firstName) return firstName;
  return email;
}

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
        <button className="text-muted-foreground hover:text-destructive text-xs transition-colors">
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
  const formatRelativeTime = useRelativeTime(t);

  const isAuthenticated = currentUserId !== null;
  const canComment = isAuthenticated && !isPastMoment;

  function handleSubmit() {
    if (!content.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await addCommentAction(momentId, content);
      if (result.success) {
        setContent("");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="border-border rounded-2xl border p-6">
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
                  {comment.user.image ? (
                    <img
                      src={comment.user.image}
                      alt=""
                      className="size-8 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                      style={{
                        background: getMomentGradient(comment.user.email),
                      }}
                    >
                      {getInitials(
                        comment.user.firstName,
                        comment.user.lastName,
                        comment.user.email
                      )}
                    </div>
                  )}

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
                      <span className="text-muted-foreground text-xs">
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
                      {comment.content}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Form or sign-in prompt */}
        {isPastMoment ? null : isAuthenticated ? (
          <div className="space-y-2 pt-2">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t("comments.placeholder")}
              rows={3}
              maxLength={MAX_CONTENT_LENGTH}
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring w-full resize-none rounded-xl border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
              disabled={isPending}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground text-xs">
                {content.length} / {MAX_CONTENT_LENGTH}
              </span>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isPending || content.trim().length === 0}
              >
                {t("comments.submit")}
              </Button>
            </div>
            {error && (
              <p className="text-destructive text-xs">{error}</p>
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
    </div>
  );
}
