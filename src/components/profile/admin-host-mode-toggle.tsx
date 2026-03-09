"use client";

import { useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Switch } from "@/components/ui/switch";
import { toggleAdminHostModeAction } from "@/app/actions/admin";

type AdminHostModeToggleProps = {
  enabled: boolean;
};

export function AdminHostModeToggle({ enabled }: AdminHostModeToggleProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleToggle(value: boolean) {
    startTransition(async () => {
      await toggleAdminHostModeAction(value);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">Mode Organisateur universel</p>
        <p className="text-muted-foreground text-xs">
          Accéder à toutes les Communautés en tant qu&apos;Organisateur, sans apparaître dans les listes de membres.
        </p>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={handleToggle}
        disabled={isPending}
        aria-label="Activer le mode Organisateur universel"
      />
    </div>
  );
}
