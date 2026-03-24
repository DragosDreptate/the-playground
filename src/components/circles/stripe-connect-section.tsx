"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, CreditCard, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { onboardStripeConnectAction, getStripeLoginLinkAction } from "@/app/actions/stripe";
import type { ConnectAccountStatus } from "@/domain/ports/services/payment-service";

type StripeConnectSectionProps = {
  circleId: string;
  circleSlug: string;
  hasAccount: boolean;
  status: ConnectAccountStatus | null;
};

export function StripeConnectSection({
  circleId,
  circleSlug,
  hasAccount,
  status: initialStatus,
}: StripeConnectSectionProps) {
  const t = useTranslations("Circle");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isActive = hasAccount && initialStatus === "active";
  const isPendingOrRestricted =
    hasAccount && (initialStatus === "pending" || initialStatus === "restricted");

  function handleActivate() {
    setError(null);
    startTransition(async () => {
      const returnUrl = `${window.location.origin}/dashboard/circles/${circleSlug}/edit`;
      const result = await onboardStripeConnectAction(circleId, returnUrl);
      if (result.success) {
        window.location.href = result.data.onboardingUrl;
      } else {
        setError(result.error);
      }
    });
  }

  function handleViewDashboard() {
    setError(null);
    startTransition(async () => {
      const result = await getStripeLoginLinkAction(circleId);
      if (result.success) {
        window.open(result.data.url, "_blank");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="rounded-lg border p-6">
      <div className="flex items-center gap-2">
        <CreditCard className="text-muted-foreground size-5" />
        <h3 className="text-lg font-semibold">{t("stripeConnect.title")}</h3>
      </div>
      <p className="text-muted-foreground mt-1 text-sm">
        {t("stripeConnect.description")}
      </p>

      <div className="mt-4">
        {isActive && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="size-4" />
              <span>{t("stripeConnect.active")}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewDashboard}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ExternalLink className="size-4" />
              )}
              {t("stripeConnect.viewDashboard")}
            </Button>
          </div>
        )}

        {isPendingOrRestricted && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <AlertCircle className="size-4" />
              <span>{t("stripeConnect.pending")}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleActivate}
              disabled={isPending}
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {t("stripeConnect.resume")}
            </Button>
          </div>
        )}

        {!hasAccount && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleActivate}
            disabled={isPending}
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {t("stripeConnect.activate")}
          </Button>
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
