"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { Users, Compass } from "lucide-react";
import { setDashboardModeAction } from "@/app/actions/dashboard";
import type { DashboardMode } from "@/domain/models/user";

type WelcomeModeChoiceProps = {
  firstName: string | null;
};

export function WelcomeModeChoice({ firstName }: WelcomeModeChoiceProps) {
  const t = useTranslations("Welcome");
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<DashboardMode>("PARTICIPANT");
  const [isPending, startTransition] = useTransition();

  function handleContinue() {
    startTransition(async () => {
      await setDashboardModeAction(selectedMode);
      if (selectedMode === "ORGANIZER") {
        router.push("/dashboard?mode=organizer&tab=circles");
      } else {
        router.push("/dashboard?mode=participant&tab=moments");
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-8 text-center">
      {/* Greeting */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {firstName ? t("modeChoice.greeting", { name: firstName }) : t("modeChoice.greetingAnonymous")}
        </h1>
        <p className="text-muted-foreground">{t("modeChoice.subtitle")}</p>
      </div>

      {/* Mode cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Participant card */}
        <button
          type="button"
          onClick={() => setSelectedMode("PARTICIPANT")}
          className={`flex flex-col items-center gap-4 rounded-2xl border-2 px-6 py-8 text-center transition-all ${
            selectedMode === "PARTICIPANT"
              ? "border-primary"
              : "border-border hover:border-muted-foreground/40"
          }`}
        >
          <Compass
            className={`size-10 ${selectedMode === "PARTICIPANT" ? "text-primary" : "text-muted-foreground"}`}
          />
          <div className="space-y-1.5">
            <p className="font-semibold">{t("modeChoice.participant.title")}</p>
            <p className="text-muted-foreground text-sm">
              {t("modeChoice.participant.description")}
            </p>
          </div>
        </button>

        {/* Organizer card */}
        <button
          type="button"
          onClick={() => setSelectedMode("ORGANIZER")}
          className={`flex flex-col items-center gap-4 rounded-2xl border-2 px-6 py-8 text-center transition-all ${
            selectedMode === "ORGANIZER"
              ? "border-primary"
              : "border-border hover:border-muted-foreground/40"
          }`}
        >
          <Users
            className={`size-10 ${selectedMode === "ORGANIZER" ? "text-primary" : "text-muted-foreground"}`}
          />
          <div className="space-y-1.5">
            <p className="font-semibold">{t("modeChoice.organizer.title")}</p>
            <p className="text-muted-foreground text-sm">
              {t("modeChoice.organizer.description")}
            </p>
          </div>
        </button>
      </div>

      {/* CTAs */}
      <div className="space-y-3">
        <Button
          onClick={handleContinue}
          disabled={isPending}
          className="w-full"
          size="lg"
        >
          {isPending ? t("modeChoice.continuing") : t("modeChoice.continue")}
        </Button>

        {selectedMode === "PARTICIPANT" ? (
          <Button asChild variant="outline" className="w-full" size="lg">
            <Link href="/explorer">{t("modeChoice.participant.cta")}</Link>
          </Button>
        ) : (
          <Button asChild variant="outline" className="w-full" size="lg">
            <Link href="/dashboard/circles/new">{t("modeChoice.organizer.cta")}</Link>
          </Button>
        )}

        <p className="text-muted-foreground text-xs">{t("modeChoice.hint")}</p>
      </div>
    </div>
  );
}
