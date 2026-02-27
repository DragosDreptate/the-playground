"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { setDashboardModeAction } from "@/app/actions/dashboard";
import type { DashboardMode } from "@/domain/models/user";

type DashboardModeSwitcherProps = {
  currentMode: DashboardMode | null;
  activeTab: "moments" | "circles";
};

export function DashboardModeSwitcher({ currentMode, activeTab }: DashboardModeSwitcherProps) {
  const t = useTranslations("Dashboard");
  const router = useRouter();
  const [, startTransition] = useTransition();

  function handleSwitch(mode: DashboardMode) {
    if (mode === currentMode) return;
    router.push(`?mode=${mode.toLowerCase()}&tab=${activeTab}`);
    startTransition(() => {
      setDashboardModeAction(mode);
    });
  }

  return (
    <div className="flex items-center gap-1 rounded-full border p-1">
      <button
        type="button"
        onClick={() => handleSwitch("PARTICIPANT")}
        className={`rounded-full px-4 py-1 text-sm font-medium transition-colors ${
          currentMode === "PARTICIPANT" || currentMode === null
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {t("modeParticipant")}
      </button>
      <button
        type="button"
        onClick={() => handleSwitch("ORGANIZER")}
        className={`rounded-full px-4 py-1 text-sm font-medium transition-colors ${
          currentMode === "ORGANIZER"
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {t("modeOrganizer")}
      </button>
    </div>
  );
}
