"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Clock, LogOut } from "lucide-react";
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
import { createCheckoutAction } from "@/app/actions/checkout";
import { handleOnboardingRequired } from "@/lib/onboarding";
import { canAutoJoin } from "@/lib/auto-join";
import { useAutoJoin } from "@/components/auth/use-auto-join";
import { formatPrice } from "@/lib/format-price";
import type { Registration, RegistrationStatus } from "@/domain/models/registration";
import type { CalendarEventData } from "@/lib/calendar";
import { captureIntentEvent } from "@/lib/capture-intent";
import posthog from "posthog-js";
import { toast } from "sonner";

type RegistrationButtonProps = {
  momentId: string;
  slug: string;
  circleId: string;
  circleName: string;
  price: number;
  currency: string;
  isAuthenticated: boolean;
  existingRegistration: Registration | null;
  signInUrl: string;
  isFull: boolean;
  calendarData?: CalendarEventData;
  appUrl?: string;
  waitlistPosition?: number;
  requiresApproval?: boolean;
  refundable?: boolean;
};

export function RegistrationButton({
  momentId,
  slug,
  circleId,
  circleName,
  price,
  currency,
  isAuthenticated,
  existingRegistration,
  signInUrl,
  isFull,
  calendarData,
  appUrl,
  waitlistPosition,
  requiresApproval = false,
  refundable = true,
}: RegistrationButtonProps) {
  const t = useTranslations("Moment");
  const tCommon = useTranslations("Common");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [localStatus, setLocalStatus] = useState<RegistrationStatus | null>(
    existingRegistration?.status ?? null
  );
  const [localRegistrationId, setLocalRegistrationId] = useState<string | null>(
    existingRegistration?.id ?? null
  );
  const [error, setError] = useState<string | null>(null);

  // Inscription gratuite (le chemin payant passe par Stripe, cf. plus bas).
  // Partagé par le clic et l'auto-inscription post-auth.
  function runJoin(trigger: "click" | "auto") {
    startTransition(async () => {
      setError(null);
      const result = await joinMomentAction(momentId);
      if (result.success) {
        setLocalStatus(result.data.status);
        setLocalRegistrationId(result.data.id);
        posthog.capture("moment_joined", {
          moment_id: momentId,
          circle_id: circleId,
          circle_name: circleName,
          registration_status: result.data.status,
          trigger,
        });
        // L'auto-inscription se déclenche sans clic : un toast confirme
        // explicitement le succès (le clic manuel a déjà le retour du bouton).
        if (trigger === "auto") {
          if (result.data.status === "REGISTERED") {
            toast.success(t("public.autoJoinSuccess"));
          } else if (result.data.status === "WAITLISTED") {
            toast(t("public.autoJoinWaitlisted"));
          } else if (result.data.status === "PENDING_APPROVAL") {
            toast(t("public.autoJoinPending"));
          }
        }
        router.refresh();
        return;
      }
      if (handleOnboardingRequired(result, router)) return;
      setError(result.error);
    });
  }

  // Auto-inscription post-auth : si l'utilisateur vient d'un CTA « S'inscrire »
  // (marqueur `?join=1`), déclenche l'inscription au retour, sans re-cliquer.
  // Exclut le payant (blocked) et les inscriptions déjà actives (alreadyEngaged).
  useAutoJoin({
    enabled: canAutoJoin({
      isAuthenticated,
      alreadyEngaged:
        localStatus !== null &&
        localStatus !== "CANCELLED" &&
        localStatus !== "REJECTED",
      blocked: price > 0,
    }),
    onTrigger: () => runJoin("auto"),
  });

  // Intention d'inscription : clic manuel sur le CTA (l'auto-inscription
  // post-auth est exclue, l'intention a déjà été capturée avant l'auth).
  function captureRegisterIntent(authenticated: boolean) {
    captureIntentEvent(
      "register_cta_clicked",
      { moment_id: momentId, circle_id: circleId },
      authenticated
    );
  }

  // Libellé du CTA d'inscription gratuit — calculé une fois et partagé entre
  // les branches visiteur et connecté : le visiteur doit voir exactement le
  // même libellé métier avant et après l'authentification.
  const joinLabel = requiresApproval
    ? t("public.requestToJoin")
    : isFull
      ? t("public.joinWaitlist")
      : t("public.registerFree");

  // Non connecté, gratuit : le CTA affiche l'action métier, pas la friction —
  // l'auth est une étape du flux (?join=1 → auto-inscription au retour). Le
  // clic exprime l'intention d'inscription (#610). Le payant garde « Se
  // connecter pour s'inscrire » : l'auto-inscription y est bloquée (pas
  // d'auto-paiement), le libellé en deux temps reste donc honnête, et
  // l'intention n'est capturée qu'au clic post-auth (un event par parcours).
  if (!isAuthenticated) {
    if (price > 0) {
      return (
        <Button className="w-full" size="sm" asChild>
          <a href={signInUrl}>{t("public.signInToRegister")}</a>
        </Button>
      );
    }
    return (
      <Button className="w-full" size="sm" asChild>
        <a href={signInUrl} onClick={() => captureRegisterIntent(false)}>
          {joinLabel}
        </a>
      </Button>
    );
  }

  // Paid events: redirect to Stripe Checkout (no waitlist)
  if (price > 0 && !localStatus) {
    if (isFull) {
      return (
        <Button className="w-full" size="sm" disabled>
          {t("public.eventFull")}
        </Button>
      );
    }

    return (
      <div className="space-y-2">
        <Button
          className="w-full"
          size="sm"
          disabled={isPending}
          onClick={() => {
            captureRegisterIntent(true);
            startTransition(async () => {
              setError(null);
              const baseUrl = window.location.origin;
              const result = await createCheckoutAction(
                momentId,
                slug,
                `${baseUrl}/m/${slug}`
              );
              if (result.success) {
                window.location.href = result.data.url;
              } else {
                setError(result.error);
              }
            });
          }}
        >
          {isPending
            ? tCommon("loading")
            : t("public.registerPaid", {
                price: formatPrice(price, currency, locale),
                currency,
              })}
        </Button>
        {error && (
          <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Pending approval
  if (localStatus === "PENDING_APPROVAL") {
    return (
      <div className="flex w-full items-center justify-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/5 px-4 py-2.5 text-sm font-medium text-amber-500">
        <Clock className="size-4" />
        {t("public.pendingApproval")}
      </div>
    );
  }

  // Already registered or waitlisted → CTA "Annuler mon inscription"
  // Pour REGISTERED, le bouton primary suffit à signaler l'inscription. Pour WAITLISTED,
  // on garde le pill car il porte la position dans la file d'attente.
  if (localStatus === "REGISTERED" || localStatus === "WAITLISTED") {
    const isRegistered = localStatus === "REGISTERED";
    return (
      <div className="space-y-3">
        {!isRegistered && (
          <div className="flex w-full items-center justify-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/5 px-4 py-2.5 text-sm font-medium text-amber-500">
            <Clock className="size-4" />
            {waitlistPosition && waitlistPosition > 0
              ? t("public.youAreWaitlistedWithPosition", { position: waitlistPosition })
              : t("public.youAreWaitlisted")}
          </div>
        )}
        <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary"
          >
            <LogOut className="size-3.5" />
            {t("public.cancelRegistration")}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("public.cancelConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("public.cancelConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {price > 0 && existingRegistration?.paymentStatus === "PAID" && (
            <div className={`rounded-md p-3 text-sm ${refundable ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500"}`}>
              {refundable
                ? t("public.cancelRefundableInfo")
                : t("public.cancelNonRefundableWarning")}
            </div>
          )}
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
                  const result = await cancelRegistrationAction(localRegistrationId);
                  if (result.success) {
                    posthog.capture("registration_cancelled", {
                      moment_id: momentId,
                      circle_id: circleId,
                    });
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
      </div>
    );
  }

  // Default: register or join waitlist
  return (
    <div className="space-y-2">
      <Button
        className="w-full"
        size="sm"
        disabled={isPending}
        onClick={() => {
          captureRegisterIntent(true);
          runJoin("click");
        }}
      >
        {isPending ? tCommon("loading") : joinLabel}
      </Button>
      {error && (
        <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
