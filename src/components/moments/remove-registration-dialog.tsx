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
import { removeRegistrationByHostAction } from "@/app/actions/registration";

type RemoveRegistrationDialogProps = {
  registrationId: string;
  playerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  willRefund?: boolean;
  onRemoved?: () => void;
};

export function RemoveRegistrationDialog({
  registrationId,
  playerName,
  open,
  onOpenChange,
  willRefund = false,
  onRemoved,
}: RemoveRegistrationDialogProps) {
  const router = useRouter();
  const t = useTranslations("Moment.registrations");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRemove() {
    setIsPending(true);
    setError(null);

    const result = await removeRegistrationByHostAction(registrationId);

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
          <AlertDialogTitle>{t("removeTitle", { name: playerName })}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("removeDescription", { name: playerName })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {willRefund && (
          <div className="rounded-md bg-amber-500/10 p-3 text-sm text-amber-500">
            {t("removeRefundWarning", { name: playerName })}
          </div>
        )}
        {error && (
          <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
            {error}
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {t("removeCancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRemove}
            disabled={isPending}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isPending ? "…" : t("removeConfirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
