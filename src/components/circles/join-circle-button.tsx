"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import posthog from "posthog-js";
import { toast } from "sonner";
import { captureIntentEvent } from "@/lib/capture-intent";
import { Users, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { joinCircleDirectlyAction } from "@/app/actions/circle";
import { handleOnboardingRequired } from "@/lib/onboarding";
import { useAutoJoin } from "@/components/auth/use-auto-join";
import { useTranslations } from "next-intl";

type Props = {
  circleId: string;
  requiresApproval?: boolean;
  /** Non connecté : le CTA devient un lien vers l'auth (avec `?join=1`). */
  signInUrl?: string | null;
};

export function JoinCircleButton({ circleId, requiresApproval = false, signInUrl = null }: Props) {
  const t = useTranslations("Circle.detail");
  const router = useRouter();
  const [state, setState] = useState<"idle" | "joined" | "pending">("idle");
  const [isPending, startTransition] = useTransition();

  // Partagé par le clic et l'auto-adhésion post-auth.
  function runJoin(trigger: "click" | "auto") {
    startTransition(async () => {
      const result = await joinCircleDirectlyAction(circleId);
      if (result.success) {
        posthog.capture("circle_joined_directly", { circle_id: circleId, trigger });
        setState(result.data.pendingApproval ? "pending" : "joined");
        // L'auto-adhésion se déclenche sans clic : un toast confirme le succès.
        if (trigger === "auto") {
          if (result.data.pendingApproval) {
            toast(t("autoJoinPending"));
          } else {
            toast.success(t("autoJoinSuccess"));
          }
        }
        router.refresh();
        return;
      }
      handleOnboardingRequired(result, router);
    });
  }

  // Auto-adhésion post-auth : si l'URL porte `?join=1` (CTA « Rejoindre » avant
  // authentification), déclenche l'adhésion au retour, sans re-cliquer.
  // Uniquement en mode connecté non-membre (signInUrl null).
  useAutoJoin({
    enabled: state === "idle" && !signInUrl,
    onTrigger: () => runJoin("auto"),
  });

  // Intention d'adhésion : clic manuel sur le CTA (l'auto-adhésion post-auth
  // est exclue, l'intention a déjà été capturée avant l'auth).
  function captureJoinIntent(authenticated: boolean) {
    captureIntentEvent("join_circle_cta_clicked", { circle_id: circleId }, authenticated);
  }

  // Contenu partagé entre les branches visiteur et connecté : le visiteur doit
  // voir exactement le même libellé métier avant et après l'authentification.
  const joinContent = (
    <>
      <Users className="size-4" />
      {requiresApproval ? t("joinRequiresApproval") : t("join")}
    </>
  );

  // Non connecté : le CTA affiche l'action métier (« Rejoindre »), pas la
  // friction — l'auth est une étape du flux (?join=1 → auto-adhésion au retour).
  if (signInUrl) {
    return (
      <Button variant="default" size="sm" asChild className="w-full gap-2">
        <a href={signInUrl} onClick={() => captureJoinIntent(false)}>
          {joinContent}
        </a>
      </Button>
    );
  }

  if (state === "joined") {
    return (
      <Button variant="secondary" size="sm" disabled className="w-full gap-2">
        <Check className="size-4" />
        {t("joined")}
      </Button>
    );
  }

  if (state === "pending") {
    return (
      <Button variant="secondary" size="sm" disabled className="w-full gap-2">
        <Clock className="size-4" />
        {t("pendingApproval")}
      </Button>
    );
  }

  return (
    <Button
      variant="default"
      size="sm"
      onClick={() => {
        captureJoinIntent(true);
        runJoin("click");
      }}
      disabled={isPending}
      className="w-full gap-2"
    >
      {joinContent}
    </Button>
  );
}
