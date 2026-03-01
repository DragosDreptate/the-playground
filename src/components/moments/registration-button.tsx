"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Check, Clock, Download } from "lucide-react";
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
import { buildGoogleCalendarUrl, type CalendarEventData } from "@/lib/calendar";

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
      <div className="space-y-3">

        {/* Banner de confirmation */}
        <div className={`flex items-center gap-3 rounded-xl p-4 ${isRegistered ? "bg-primary/[0.06]" : "bg-amber-500/[0.06]"}`}>
          <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${isRegistered ? "bg-primary/15 text-primary" : "bg-amber-500/15 text-amber-500"}`}>
            {isRegistered ? <Check className="size-4" /> : <Clock className="size-4" />}
          </div>
          <div>
            <p className="text-sm font-semibold">
              {isRegistered ? t("public.registeredBannerTitle") : t("public.waitlistedBannerTitle")}
            </p>
            <p className="text-muted-foreground text-xs">
              {t("public.registrantsCount", { count: registrationCount })}
              {!isRegistered && waitlistPosition != null && waitlistPosition > 0
                ? ` · ${t("public.waitlistPosition", { position: waitlistPosition })}`
                : !isFull && spotsRemaining !== null
                  ? ` · ${t("public.spotsRemaining", { count: spotsRemaining })}`
                  : isFull
                    ? ` · ${t("public.eventFull")}`
                    : ""}
            </p>
          </div>
        </div>

        {/* Boutons calendrier — inscrits confirmés uniquement */}
        {isRegistered && calendarData && appUrl && (
          <div className="flex gap-2">
            <Button variant="outline" className="h-[34px] flex-1 gap-1.5 rounded-xl text-xs" asChild>
              <a href={buildGoogleCalendarUrl(calendarData, appUrl)} target="_blank" rel="noopener noreferrer">
                <svg width="13" height="13" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                {t("public.addToCalendar.google")}
              </a>
            </Button>
            <Button variant="outline" className="h-[34px] flex-1 gap-1.5 rounded-xl text-xs" asChild>
              <a href={`/api/moments/${calendarData.slug}/calendar`} download={`${calendarData.slug}.ics`}>
                <Download className="size-3" />
                {t("public.addToCalendar.ics")}
              </a>
            </Button>
          </div>
        )}

        {/* Annuler — lien texte discret */}
        {!isHost && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="text-muted-foreground hover:text-destructive w-full text-center text-xs underline underline-offset-2 transition-colors">
                {t("public.cancelRegistration")}
              </button>
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
