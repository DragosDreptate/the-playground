"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  joinMomentAction,
  cancelRegistrationAction,
} from "@/app/actions/registration";
import type { Registration, RegistrationStatus } from "@/domain/models/registration";

type RegistrationButtonProps = {
  momentId: string;
  price: number;
  isAuthenticated: boolean;
  existingRegistration: Registration | null;
  signInUrl: string;
  isFull: boolean;
  spotsRemaining: number | null;
};

export function RegistrationButton({
  momentId,
  price,
  isAuthenticated,
  existingRegistration,
  signInUrl,
  isFull,
  spotsRemaining,
}: RegistrationButtonProps) {
  const t = useTranslations("Moment");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [localStatus, setLocalStatus] = useState<RegistrationStatus | null>(
    existingRegistration?.status ?? null
  );
  const [localRegistrationId, setLocalRegistrationId] = useState<string | null>(
    existingRegistration?.id ?? null
  );
  const [error, setError] = useState<string | null>(null);

  // Paid Moments: disabled "Coming soon"
  if (price > 0) {
    return (
      <Button size="lg" className="w-full" disabled>
        {t("public.comingSoon")}
      </Button>
    );
  }

  // Not authenticated: link to sign-in
  if (!isAuthenticated) {
    return (
      <Button size="lg" className="w-full" asChild>
        <a href={signInUrl}>{t("public.signInToRegister")}</a>
      </Button>
    );
  }

  // Already registered or waitlisted: show status + cancel option
  if (localStatus === "REGISTERED" || localStatus === "WAITLISTED") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-2">
          <Badge
            variant={localStatus === "REGISTERED" ? "default" : "secondary"}
            className="text-sm"
          >
            {localStatus === "REGISTERED"
              ? t("public.registered")
              : t("public.waitlisted")}
          </Badge>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              {t("public.cancelRegistration")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("public.cancelConfirmTitle")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("public.cancelConfirmDescription")}
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
                onClick={() => {
                  if (!localRegistrationId) return;
                  startTransition(async () => {
                    setError(null);
                    const result = await cancelRegistrationAction(
                      localRegistrationId
                    );
                    if (result.success) {
                      setLocalStatus(null);
                      setLocalRegistrationId(null);
                      router.refresh();
                    } else {
                      setError(result.error);
                    }
                  });
                }}
              >
                {isPending
                  ? tCommon("loading")
                  : t("public.confirmCancel")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Default: register or join waitlist
  return (
    <div className="space-y-2">
      <Button
        size="lg"
        className="w-full"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            setError(null);
            const result = await joinMomentAction(momentId);
            if (result.success) {
              setLocalStatus(result.data.status);
              setLocalRegistrationId(result.data.id);
              router.refresh();
            } else {
              setError(result.error);
            }
          });
        }}
      >
        {isPending
          ? tCommon("loading")
          : isFull
            ? t("public.joinWaitlist")
            : t("public.registerFree")}
      </Button>
      {spotsRemaining !== null && spotsRemaining > 0 && !isFull && (
        <p className="text-muted-foreground text-center text-sm">
          {t("public.spotsRemaining", { count: spotsRemaining })}
        </p>
      )}
      {error && (
        <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
