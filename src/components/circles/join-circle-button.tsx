"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import posthog from "posthog-js";
import { Users, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { joinCircleDirectlyAction } from "@/app/actions/circle";
import { useTranslations } from "next-intl";

type Props = {
  circleId: string;
};

export function JoinCircleButton({ circleId }: Props) {
  const t = useTranslations("Circle.detail");
  const router = useRouter();
  const [joined, setJoined] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleJoin() {
    startTransition(async () => {
      const result = await joinCircleDirectlyAction(circleId);
      if (result.success) {
        posthog.capture("circle_joined_directly", { circle_id: circleId });
        setJoined(true);
        router.refresh();
      }
    });
  }

  if (joined) {
    return (
      <Button variant="secondary" size="sm" disabled className="w-full gap-2">
        <Check className="size-4" />
        {t("joined")}
      </Button>
    );
  }

  return (
    <Button
      variant="default"
      size="sm"
      onClick={handleJoin}
      disabled={isPending}
      className="w-full gap-2"
    >
      <Users className="size-4" />
      {t("join")}
    </Button>
  );
}
