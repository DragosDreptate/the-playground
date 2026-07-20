"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Check, Plus } from "lucide-react";
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
import {
  registerAsOrganizerAction,
  cancelRegistrationAction,
} from "@/app/actions/registration";
import type { Registration } from "@/domain/models/registration";
import posthog from "posthog-js";

type OrganizerParticipationControlProps = {
  momentId: string;
  registration: Registration | null;
};

/**
 * Contrôle de participation d'un organisateur à un événement de son Circle.
 * Découplé de son rôle : « Gérer » reste l'action principale (rendue à côté), ce
 * bloc gère uniquement sa présence, optionnelle. Inscription silencieuse (aucun
 * email), désinscription via confirmation.
 */
export function OrganizerParticipationControl({
  momentId,
  registration,
}: OrganizerParticipationControlProps) {
  const t = useTranslations("Moment");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [registered, setRegistered] = useState(
    registration?.status === "REGISTERED" || registration?.status === "CHECKED_IN"
  );
  const [registrationId, setRegistrationId] = useState<string | null>(
    registration?.id ?? null
  );
  const [error, setError] = useState<string | null>(null);

  function handleRegister() {
    startTransition(async () => {
      setError(null);
      const result = await registerAsOrganizerAction(momentId);
      if (result.success) {
        setRegistered(true);
        setRegistrationId(result.data.id);
        posthog.capture("organizer_registered", { moment_id: momentId });
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function handleCancel() {
    if (!registrationId) return;
    startTransition(async () => {
      setError(null);
      const result = await cancelRegistrationAction(registrationId);
      if (result.success) {
        setRegistered(false);
        setRegistrationId(null);
        posthog.capture("organizer_registration_cancelled", {
          moment_id: momentId,
        });
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="border-border bg-muted/30 rounded-2xl border p-4">
      <p className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wide">
        {t("organizerParticipation.label")}
      </p>

      {registered ? (
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <Check className="size-3.5" />
            {t("organizerParticipation.registered")}
          </span>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-primary h-auto px-2 py-1 text-xs underline underline-offset-2"
              >
                {t("organizerParticipation.cancel")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("public.cancelConfirmTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("organizerParticipation.cancelConfirmDescription")}
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
                  variant="destructive"
                  disabled={isPending}
                  onClick={handleCancel}
                >
                  {isPending ? tCommon("loading") : t("public.confirmCancel")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ) : (
        <>
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5"
            disabled={isPending}
            onClick={handleRegister}
          >
            <Plus className="size-3.5" />
            {isPending ? tCommon("loading") : t("organizerParticipation.register")}
          </Button>
          <p className="text-muted-foreground mt-2.5 text-xs">
            {t("organizerParticipation.hint")}
          </p>
          {error && (
            <div className="bg-destructive/10 text-destructive mt-2 rounded-md p-3 text-sm">
              {error}
            </div>
          )}
        </>
      )}
    </div>
  );
}
