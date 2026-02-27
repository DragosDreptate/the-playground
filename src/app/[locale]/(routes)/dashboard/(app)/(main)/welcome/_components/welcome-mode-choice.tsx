"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { Check, Compass, Crown, ArrowRight } from "lucide-react";
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
        router.push("/dashboard?mode=organizer&tab=moments");
      } else {
        router.push("/dashboard?mode=participant&tab=moments");
      }
    });
  }

  function handleCardCta(mode: DashboardMode, href: string) {
    startTransition(async () => {
      await setDashboardModeAction(mode);
      router.push(href);
    });
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-8 text-center">

      {/* Greeting */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {firstName ? (
            <>
              {t("modeChoice.greetingPrefix")}{" "}
              <span className="text-primary">{firstName}</span>
              {" — "}
              {t("modeChoice.greetingSuffix")}
            </>
          ) : (
            t("modeChoice.greetingAnonymous")
          )}
        </h1>
        <p className="text-muted-foreground">{t("modeChoice.subtitle")}</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

        {/* Participant */}
        <button
          type="button"
          onClick={() => setSelectedMode("PARTICIPANT")}
          className={`relative flex flex-col items-center gap-4 rounded-2xl border-2 px-6 py-8 text-center transition-all ${
            selectedMode === "PARTICIPANT"
              ? "border-primary"
              : "border-border hover:border-muted-foreground/40"
          }`}
        >
          {selectedMode === "PARTICIPANT" && (
            <span className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-full bg-primary text-white">
              <Check className="size-3.5" strokeWidth={3} />
            </span>
          )}
          <span className={`flex size-14 items-center justify-center rounded-2xl ${
            selectedMode === "PARTICIPANT" ? "bg-primary/10" : "bg-muted"
          }`}>
            <Compass className={`size-7 ${selectedMode === "PARTICIPANT" ? "text-primary" : "text-muted-foreground"}`} />
          </span>
          <div className="space-y-1.5">
            <p className="text-base font-semibold">{t("modeChoice.participant.title")}</p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t("modeChoice.participant.description")}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              handleCardCta("PARTICIPANT", "/explorer");
            }}
            disabled={isPending}
          >
            {t("modeChoice.participant.cta")}
          </Button>
        </button>

        {/* Organizer */}
        <button
          type="button"
          onClick={() => setSelectedMode("ORGANIZER")}
          className={`relative flex flex-col items-center gap-4 rounded-2xl border-2 px-6 py-8 text-center transition-all ${
            selectedMode === "ORGANIZER"
              ? "border-primary"
              : "border-border hover:border-muted-foreground/40"
          }`}
        >
          {selectedMode === "ORGANIZER" && (
            <span className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-full bg-primary text-white">
              <Check className="size-3.5" strokeWidth={3} />
            </span>
          )}
          <span className={`flex size-14 items-center justify-center rounded-2xl ${
            selectedMode === "ORGANIZER" ? "bg-primary/10" : "bg-muted"
          }`}>
            <Crown className={`size-7 ${selectedMode === "ORGANIZER" ? "text-primary" : "text-muted-foreground"}`} />
          </span>
          <div className="space-y-1.5">
            <p className="text-base font-semibold">{t("modeChoice.organizer.title")}</p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t("modeChoice.organizer.description")}
            </p>
          </div>
          <Button
            size="sm"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              handleCardCta("ORGANIZER", "/dashboard/circles/new");
            }}
            disabled={isPending}
          >
            {t("modeChoice.organizer.cta")}
          </Button>
        </button>

      </div>

      {/* Bottom CTA + hint */}
      <div className="space-y-3">
        <Button
          onClick={handleContinue}
          disabled={isPending}
          className="w-full gap-2"
          size="lg"
        >
          {isPending ? t("modeChoice.continuing") : t("modeChoice.continue")}
          {!isPending && <ArrowRight className="size-4" />}
        </Button>
        <p className="text-muted-foreground text-xs">{t("modeChoice.hint")}</p>
      </div>

    </div>
  );
}
