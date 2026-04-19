"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Switch } from "@/components/ui/switch";
import { setFeaturedCirclesEnabledAction } from "@/app/actions/admin";

type Props = {
  initialEnabled: boolean;
};

export function FeaturedCirclesToggle({ initialEnabled }: Props) {
  const t = useTranslations("Admin.explorer.featuredToggle");
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();

  function handleChange(checked: boolean) {
    const previous = enabled;
    setEnabled(checked);
    startTransition(async () => {
      const result = await setFeaturedCirclesEnabledAction(checked);
      if (!result.success) setEnabled(previous);
    });
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-md border bg-muted/30 px-4 py-3">
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium">{t("label")}</p>
        <p className="text-xs text-muted-foreground">{t("description")}</p>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={handleChange}
        disabled={pending}
        aria-label={t("label")}
      />
    </div>
  );
}
