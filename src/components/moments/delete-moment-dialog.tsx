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
import { deleteMomentAction } from "@/app/actions/moment";

type DeleteMomentDialogProps = {
  momentId: string;
  circleSlug: string;
  triggerClassName?: string;
};

export function DeleteMomentDialog({
  momentId,
  circleSlug,
  triggerClassName,
}: DeleteMomentDialogProps) {
  const t = useTranslations("Moment");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setIsPending(true);
    setError(null);

    const result = await deleteMomentAction(momentId);

    if (result.success) {
      setOpen(false);
      router.push(`/dashboard/circles/${circleSlug}`);
    } else {
      // On garde la modale ouverte pour afficher l'erreur (AlertDialogAction est
      // neutralisé via preventDefault, sinon Radix la fermerait au clic). Message
      // générique : les erreurs du domaine sont des messages développeur (anglais,
      // avec l'id interne) qu'on ne montre jamais tel quel à l'Organisateur.
      setError(t("delete.error"));
      setIsPending(false);
    }
  }

  // Reset à la fermeture pour ne pas réafficher une erreur périmée à la réouverture.
  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setError(null);
      setIsPending(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`border-destructive/40 text-destructive hover:border-destructive hover:bg-destructive/10 hover:text-destructive ${triggerClassName ?? ""}`}
        >
          {tCommon("delete")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("delete.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("delete.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
            {error}
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {tCommon("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void handleDelete();
            }}
            disabled={isPending}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isPending ? tCommon("loading") : t("delete.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
