"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
import { deleteAccountAction } from "@/app/actions/profile";

export function DeleteAccountDialog() {
  const t = useTranslations("Profile.deleteAccount");
  const tCommon = useTranslations("Common");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setIsPending(true);
    setError(null);

    const result = await deleteAccountAction();

    // Si on arrive ici, c'est qu'il y a eu une erreur (signOut redirige en interne)
    if (result && !result.success) {
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
          className="border-destructive/40 text-destructive hover:border-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          {t("trigger")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("warning")}</AlertDialogDescription>
        </AlertDialogHeader>
        <ul className="bg-destructive/5 border-destructive/20 text-foreground rounded-lg border px-4 py-3 text-sm">
          <li className="flex items-start gap-2 py-0.5">
            <span className="text-destructive mt-1.5 size-1.5 shrink-0 rounded-full bg-current" />
            {t("items.registrations")}
          </li>
          <li className="flex items-start gap-2 py-0.5">
            <span className="text-destructive mt-1.5 size-1.5 shrink-0 rounded-full bg-current" />
            {t("items.comments")}
          </li>
          <li className="flex items-start gap-2 py-0.5">
            <span className="text-destructive mt-1.5 size-1.5 shrink-0 rounded-full bg-current" />
            {t("items.circles")}
          </li>
        </ul>
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
            {isPending ? tCommon("loading") : t("confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
