"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
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
import { formatPrice } from "@/lib/format-price";
import type { Registration, RegistrationStatus } from "@/domain/models/registration";
import type { CalendarEventData } from "@/lib/calendar";
import posthog from "posthog-js";

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
  spotsRemaining: number | null;
  registrationCount: number;
  isOrganizer?: boolean;
  calendarData?: CalendarEventData;
  appUrl?: string;
  waitlistPosition?: number;
  requiresApproval?: boolean;
  refundable?: boolean;
};

function StatsInfo({
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
    <div className="hidden shrink-0 flex-col items-end gap-0.5">
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
  slug,
  circleId,
  circleName,
  price,
  currency,
  isAuthenticated,
  existingRegistration,
  signInUrl,
  isFull,
  spotsRemaining,
  registrationCount,
  isOrganizer = false,
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

  // Not authenticated: link to sign-in (same for free and paid)
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-between gap-3">
        <Button className="w-full" size="sm" asChild>
          <a href={signInUrl}>{t("public.signInToRegister")}</a>
        </Button>
        <StatsInfo count={registrationCount} spotsRemaining={spotsRemaining} isFull={isFull} />
      </div>
    );
  }

  // Paid events: redirect to Stripe Checkout (no waitlist)
  if (price > 0 && !localStatus) {
    if (isFull) {
      return (
        <div className="flex items-center justify-between gap-3">
          <Button className="w-full" size="sm" disabled>
            {t("public.eventFull")}
          </Button>
          <StatsInfo count={registrationCount} spotsRemaining={spotsRemaining} isFull={isFull} />
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Button
            className="w-full"
            size="sm"
            disabled={isPending}
            onClick={() => {
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
          <StatsInfo count={registrationCount} spotsRemaining={spotsRemaining} isFull={isFull} />
        </div>
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

  // Already registered or waitlisted → badge de statut + CTA "Annuler mon inscription"
  if (localStatus === "REGISTERED" || localStatus === "WAITLISTED") {
    if (isOrganizer) return null;
    const isRegistered = localStatus === "REGISTERED";
    return (
      <div className="space-y-3">
        {isRegistered ? (
          <div className="flex w-full items-center justify-center gap-2 rounded-full border border-primary/40 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {t("public.youAreRegistered")}
          </div>
        ) : (
          <div className="flex w-full items-center justify-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/5 px-4 py-2.5 text-sm font-medium text-amber-500">
            <Clock className="size-4" />
            {waitlistPosition && waitlistPosition > 0
              ? t("public.youAreWaitlistedWithPosition", { position: waitlistPosition })
              : t("public.youAreWaitlisted")}
          </div>
        )}
        <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" className="w-full">
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
      <div className="flex items-center justify-between gap-3">
        <Button
          className="w-full"
          size="sm"
          disabled={isPending}
          onClick={() => {
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
                });
                router.refresh();
              } else {
                setError(result.error);
              }
            });
          }}
        >
          {isPending
            ? tCommon("loading")
            : requiresApproval
              ? t("public.requestToJoin")
              : isFull
                ? t("public.joinWaitlist")
                : t("public.registerFree")}
        </Button>
        <StatsInfo count={registrationCount} spotsRemaining={spotsRemaining} isFull={isFull} />
      </div>
      {error && (
        <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
