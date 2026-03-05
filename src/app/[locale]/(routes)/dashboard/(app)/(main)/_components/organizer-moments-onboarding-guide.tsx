import { getTranslations } from "next-intl/server";
import { CalendarDays, ArrowRight, Check } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { CreateMomentDropdown } from "@/components/dashboard/create-moment-dropdown";

type HostCircle = {
  slug: string;
  name: string;
  logo: string | null;
};

type StepState = "done" | "active" | "pending";

export async function OrganizerMomentsOnboardingGuide({
  hostCircles,
}: {
  hostCircles: HostCircle[];
}) {
  const t = await getTranslations("Dashboard");
  const hasCircles = hostCircles.length > 0;

  const steps: { num: number; title: string; desc: string; state: StepState }[] = [
    {
      num: 1,
      title: t("onboarding.step1Title"),
      desc: t("onboarding.step1Desc"),
      state: hasCircles ? "done" : "active",
    },
    {
      num: 2,
      title: t("onboarding.step2Title"),
      desc: t("onboarding.step2Desc"),
      state: hasCircles ? "active" : "pending",
    },
    {
      num: 3,
      title: t("onboarding.step3Title"),
      desc: t("onboarding.step3Desc"),
      state: "pending",
    },
  ];

  return (
    <div className="border-border rounded-2xl border border-dashed overflow-hidden">
      {/* Top empty state */}
      <div className="flex flex-col items-center px-6 pt-8 pb-6 text-center gap-1">
        <div className="bg-muted mb-2 flex size-10 items-center justify-center rounded-xl">
          <CalendarDays className="text-muted-foreground size-5" />
        </div>
        <p className="text-muted-foreground text-sm font-medium">
          {t("onboardingMoments.emptyTitle")}
        </p>
        <p className="text-muted-foreground/70 text-xs">
          {hasCircles
            ? t("onboardingMoments.emptyHintHasCircles")
            : t("onboardingMoments.emptyHintNoCircles")}
        </p>
      </div>

      {/* Dashed divider */}
      <hr className="border-t border-dashed border-border mx-6" />

      {/* 3-step guide */}
      <div className="px-6 pt-5 pb-6">
        <p className="text-primary mb-3 text-[11px] font-bold tracking-widest uppercase">
          {t("onboarding.label")}
        </p>
        <p className="text-foreground mb-1 text-[15px] font-bold">
          {t("onboarding.heading")}
        </p>
        <p className="text-muted-foreground mb-5 text-xs">
          {hasCircles ? t("onboardingMoments.subHasCircles") : t("onboarding.sub")}
        </p>

        {/* Steps */}
        <div className="mb-5">
          {steps.map((step, i) => (
            <div
              key={step.num}
              className={`flex items-start gap-2.5 py-2.5 ${i > 0 ? "border-t border-border" : ""}`}
            >
              {/* Step number circle */}
              <div
                className={`mt-0.5 flex size-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  step.state === "done"
                    ? "bg-green-500 text-white"
                    : step.state === "active"
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground border-border border-[1.5px]"
                }`}
              >
                {step.state === "done" ? (
                  <Check className="size-3" strokeWidth={2.5} />
                ) : (
                  step.num
                )}
              </div>

              {/* Step text */}
              <div className="flex-1">
                <p
                  className={`text-[13px] leading-snug ${
                    step.state === "done"
                      ? "text-muted-foreground font-medium line-through decoration-1"
                      : step.state === "active"
                        ? "text-foreground font-semibold"
                        : "text-muted-foreground font-medium"
                  }`}
                >
                  {step.title}
                </p>
                <p
                  className={`mt-0.5 text-[12px] leading-snug text-muted-foreground ${
                    step.state === "done"
                      ? "opacity-40 line-through decoration-1"
                      : step.state === "pending"
                        ? "opacity-60"
                        : ""
                  }`}
                >
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA adaptatif */}
        {!hasCircles && (
          <Button asChild size="lg" className="w-full">
            <Link href="/dashboard/circles/new">
              {t("onboarding.cta")}
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        )}

        {hasCircles && hostCircles.length === 1 && (
          <Button asChild size="lg" className="w-full">
            <Link href={`/dashboard/circles/${hostCircles[0].slug}/moments/new`}>
              {t("onboardingMoments.ctaEvent")}
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        )}

        {hasCircles && hostCircles.length >= 2 && (
          <CreateMomentDropdown
            circles={hostCircles}
            buttonSize="lg"
            buttonClassName="w-full gap-2"
          />
        )}
      </div>
    </div>
  );
}
