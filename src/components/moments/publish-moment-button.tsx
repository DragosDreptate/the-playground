"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { publishMomentAction } from "@/app/actions/moment";

type Props = {
  momentId: string;
  circleSlug: string;
  momentSlug: string;
  /** Classe du conteneur, ex. `flex-1` pour un CTA côte à côte. */
  className?: string;
};

export function PublishMomentButton({ momentId, circleSlug, momentSlug, className }: Props) {
  const t = useTranslations("Moment");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handlePublish() {
    setError(null);
    startTransition(async () => {
      const result = await publishMomentAction(momentId);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error ?? "Une erreur est survenue");
      }
    });
  }

  return (
    <div className={`flex flex-col gap-1 ${className ?? ""}`}>
      <Button size="sm" onClick={handlePublish} disabled={isPending} className="w-full">
        {isPending ? t("actions.publishing") : t("actions.publish")}
      </Button>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
