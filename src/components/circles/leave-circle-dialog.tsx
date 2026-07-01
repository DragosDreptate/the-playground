"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
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
import { leaveCircleAction } from "@/app/actions/circle";

type LeaveCircleDialogProps = {
  circleId: string;
  circleName: string;
};

export function LeaveCircleDialog({ circleId, circleName }: LeaveCircleDialogProps) {
  const t = useTranslations("Circle.leave");
  const locale = useLocale();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLeave() {
    setIsPending(true);
    setError(null);

    const result = await leaveCircleAction(circleId);

    if (result.success) {
      // Reload dur : ne dépend pas du Router Cache client (qui, sur un router.push,
      // sert la liste /dashboard préchargée où la Communauté quittée reste visible).
      // L'action a invalidé le cache de données en immédiat (updateTag), donc ce
      // rendu serveur reflète bien le départ.
      window.location.href = `/${locale}/dashboard?tab=circles`;
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
          className="w-full gap-2 border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary"
        >
          <LogOut className="size-3.5" />
          {t("triggerButton")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title", { circleName })}</AlertDialogTitle>
          <AlertDialogDescription>{t("description")}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
            {error}
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleLeave}
            disabled={isPending}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isPending ? t("pending") : t("confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
