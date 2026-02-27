"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Compass, Crown } from "lucide-react";
import { setDashboardModeAction } from "@/app/actions/dashboard";

type WelcomeModeChoiceProps = {
  firstName: string | null;
};

export function WelcomeModeChoice({ firstName }: WelcomeModeChoiceProps) {
  const t = useTranslations("Welcome");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSelect(mode: "PARTICIPANT" | "ORGANIZER") {
    startTransition(async () => {
      await setDashboardModeAction(mode);
      if (mode === "ORGANIZER") {
        router.push("/dashboard/circles/new");
      } else {
        router.push("/dashboard?mode=participant&tab=moments");
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-8 text-center">

      {/* Greeting */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {firstName ? (
            <>
              <span className="block">
                {t("modeChoice.greetingPrefix")}{" "}
                <span className="text-primary">{firstName}</span>
                {" 👋"}
              </span>
              <span className="block">{t("modeChoice.greetingSuffix")}</span>
            </>
          ) : (
            t("modeChoice.greetingAnonymous")
          )}
        </h1>
        <p className="text-muted-foreground">
          {t("modeChoice.subtitle")}<br />{t("modeChoice.hint")}
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

        <button
          type="button"
          disabled={isPending}
          onClick={() => handleSelect("PARTICIPANT")}
          className="flex flex-col items-center gap-4 rounded-2xl border-2 border-border px-6 py-8 text-center transition-all hover:border-primary hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="flex size-14 items-center justify-center rounded-2xl bg-muted">
            <Compass className="size-7 text-muted-foreground" />
          </span>
          <div className="space-y-1.5">
            <p className="text-base font-semibold">{t("modeChoice.participant.title")}</p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t("modeChoice.participant.description")}
            </p>
          </div>
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={() => handleSelect("ORGANIZER")}
          className="flex flex-col items-center gap-4 rounded-2xl border-2 border-border px-6 py-8 text-center transition-all hover:border-primary hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="flex size-14 items-center justify-center rounded-2xl bg-muted">
            <Crown className="size-7 text-muted-foreground" />
          </span>
          <div className="space-y-1.5">
            <p className="text-base font-semibold">{t("modeChoice.organizer.title")}</p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t("modeChoice.organizer.description")}
            </p>
          </div>
        </button>

      </div>


    </div>
  );
}
