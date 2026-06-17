"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import posthog from "posthog-js";
import { Users, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { joinCircleDirectlyAction } from "@/app/actions/circle";
import { handleOnboardingRequired } from "@/lib/onboarding";
import { useAutoJoin } from "@/components/auth/use-auto-join";
import { useTranslations } from "next-intl";

type Props = {
  circleId: string;
  requiresApproval?: boolean;
};

export function JoinCircleButton({ circleId, requiresApproval = false }: Props) {
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
        router.refresh();
        return;
      }
      handleOnboardingRequired(result, router);
    });
  }

  // Auto-adhésion post-auth : ce composant n'est monté que pour un utilisateur
  // connecté non-membre. Si l'URL porte `?join=1` (CTA « Rejoindre » avant
  // authentification), déclenche l'adhésion au retour, sans re-cliquer.
  useAutoJoin({
    enabled: state === "idle",
    onTrigger: () => runJoin("auto"),
  });

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
      onClick={() => runJoin("click")}
      disabled={isPending}
      className="w-full gap-2"
    >
      <Users className="size-4" />
      {requiresApproval ? t("joinRequiresApproval") : t("join")}
    </Button>
  );
}
