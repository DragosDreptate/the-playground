"use client";

import { useState } from "react";
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
import { cancelMomentAction } from "@/app/actions/moment";

const MAX_MESSAGE_LENGTH = 1000;

type CancelMomentDialogProps = {
  momentId: string;
  triggerClassName?: string;
};

export function CancelMomentDialog({
  momentId,
  triggerClassName,
}: CancelMomentDialogProps) {
  const t = useTranslations("Moment");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [postAsComment, setPostAsComment] = useState(false);

  const trimmedMessage = message.trim();

  async function handleCancel() {
    setIsPending(true);
    setError(null);

    const result = await cancelMomentAction(
      momentId,
      trimmedMessage || undefined,
      Boolean(trimmedMessage) && postAsComment
    );

    if (result.success) {
      // L'événement reste sur la même page, en affichage annulé.
      router.refresh();
    } else {
      setError(result.error);
      setIsPending(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`text-primary border-primary/40 hover:border-primary hover:bg-primary/10 hover:text-primary ${triggerClassName ?? ""}`}
        >
          {t("actions.cancel")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("cancel.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("cancel.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Mot optionnel aux inscrits, inclus dans l'email d'annulation */}
        <div className="space-y-2">
          <label htmlFor="cancel-message" className="text-sm font-medium">
            {t("cancel.messageLabel")}
          </label>
          <div className="border-input bg-background focus-within:border-muted-foreground rounded-xl border transition-colors">
            <textarea
              id="cancel-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("cancel.messagePlaceholder")}
              rows={3}
              maxLength={MAX_MESSAGE_LENGTH}
              disabled={isPending}
              className="placeholder:text-muted-foreground w-full resize-none border-none bg-transparent px-3 pt-2 pb-0 text-sm outline-none disabled:opacity-50"
            />
            <div className="flex justify-end px-3 pb-1.5">
              <span className="text-muted-foreground text-[11px]">
                {message.length} / {MAX_MESSAGE_LENGTH}
              </span>
            </div>
          </div>

          <label
            className={`flex cursor-pointer items-center gap-2 text-sm ${trimmedMessage ? "text-foreground" : "text-muted-foreground cursor-not-allowed"}`}
          >
            <input
              type="checkbox"
              checked={postAsComment && Boolean(trimmedMessage)}
              onChange={(e) => setPostAsComment(e.target.checked)}
              disabled={!trimmedMessage || isPending}
              className="size-4 disabled:opacity-50"
              style={{ accentColor: "var(--primary)" }}
            />
            {t("cancel.alsoPostComment")}
          </label>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
            {error}
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={handleCancel} disabled={isPending}>
            {isPending ? t("actions.cancelling") : t("cancel.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
