"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Check, Clock } from "lucide-react";
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
import type { CalendarEventData } from "@/lib/calendar";
import { AddToCalendarButtons } from "@/components/moments/add-to-calendar-buttons";

type RegistrationButtonProps = {
  momentId: string;
  price: number;
  isAuthenticated: boolean;
  existingRegistration: Registration | null;
  signInUrl: string;
  isFull: boolean;
  spotsRemaining: number | null;
  registrationCount: number;
  isHost?: boolean;
  calendarData?: CalendarEventData;
  appUrl?: string;
  waitlistPosition?: number;
};

function StatsColumn({
  count,
  spotsRemaining,
  isFull,
}: {
  count: number;
  spotsRemaining: number | null;
  isFull: boolean;
}) {
  const t = useTranslations("Moment");
  return (
    <div className="flex flex-col items-end gap-0.5 shrink-0">
      <span className="text-sm font-semibold">
        {t("public.registrantsCount", { count })}
      </span>
      {!isFull && spotsRemaining !== null && (
        <span className="text-muted-foreground text-xs">
          {t("public.spotsRemaining", { count: spotsRemaining })}
        </span>
      )}
      {isFull && (
        <span className="text-xs text-amber-400">
          {t("public.eventFull")}
        </span>
      )}
    </div>
  );
}

export function RegistrationButton({
  momentId,
  price,
  isAuthenticated,
  existingRegistration,
  signInUrl,
  isFull,
  spotsRemaining,
  registrationCount,
  isHost = false,
  calendarData,
  appUrl,
  waitlistPosition,
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
      <div className="flex items-center justify-between gap-3">
        <Button className="rounded-full" disabled>
          {t("public.comingSoon")}
        </Button>
        <StatsColumn count={registrationCount} spotsRemaining={spotsRemaining} isFull={isFull} />
      </div>
    );
  }

  // Not authenticated: link to sign-in
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-between gap-3">
        <Button className="rounded-full md:px-7" asChild>
          <a href={signInUrl}>{t("public.signInToRegister")}</a>
        </Button>
        <StatsColumn count={registrationCount} spotsRemaining={spotsRemaining} isFull={isFull} />
      </div>
    );
  }

  // Already registered or waitlisted
  if (localStatus === "REGISTERED" || localStatus === "WAITLISTED") {
    const isRegistered = localStatus === "REGISTERED";
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          {isRegistered ? (
            <Button
              variant="outline"
              className="rounded-full border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
            >
              <Check className="size-3.5" />
              {t("public.registered")}
            </Button>
          ) : (
            <Button
              variant="outline"
              className="rounded-full border-amber-500/30 bg-amber-500/5 text-amber-400 hover:bg-amber-500/10 hover:text-amber-400"
            >
              <Clock className="size-3.5" />
              {t("public.waitlisted")}
            </Button>
          )}
          <StatsColumn count={registrationCount} spotsRemaining={spotsRemaining} isFull={isFull} />
        </div>

        {/* Position liste d'attente */}
        {!isRegistered && waitlistPosition != null && waitlistPosition > 0 && (
          <p className="text-muted-foreground text-xs">
            {t("public.waitlistPosition", { position: waitlistPosition })}
          </p>
        )}

        {/* Boutons calendrier (uniquement pour les inscrits confirmés) */}
        {isRegistered && calendarData && appUrl && (
          <AddToCalendarButtons data={calendarData} appUrl={appUrl} />
        )}

        {!isHost && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="default" size="lg" className="w-full">
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
                  {isPending ? tCommon("loading") : t("public.confirmCancel")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    );
  }

  // Default: register or join waitlist
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Button
          className={`rounded-full${!isFull ? " md:px-7" : ""}`}
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
        <StatsColumn count={registrationCount} spotsRemaining={spotsRemaining} isFull={isFull} />
      </div>
      {error && (
        <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
