"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
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
} from "@/components/ui/alert-dialog";
import { removeCircleMemberAction } from "@/app/actions/circle";

type RemoveMemberDialogProps = {
  circleId: string;
  userId: string;
  memberName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemoved?: () => void;
};

export function RemoveMemberDialog({
  circleId,
  userId,
  memberName,
  open,
  onOpenChange,
  onRemoved,
}: RemoveMemberDialogProps) {
  const router = useRouter();
  const t = useTranslations("Circle.removeMember");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRemove() {
    setIsPending(true);
    setError(null);

    const result = await removeCircleMemberAction(circleId, userId);

    if (result.success) {
      onOpenChange(false);
      onRemoved?.();
      router.refresh();
    } else {
      setError(result.error);
      setIsPending(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title", { name: memberName })}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("description", { name: memberName })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
            {error}
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {t("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRemove}
            disabled={isPending}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isPending ? "…" : t("confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
