import { getTranslations } from "next-intl/server";
import { Users, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export async function OrganizerOnboardingGuide() {
  const t = await getTranslations("Dashboard");

  const steps = [
    {
      num: 1,
      title: t("onboarding.step1Title"),
      desc: t("onboarding.step1Desc"),
      active: true,
    },
    {
      num: 2,
      title: t("onboarding.step2Title"),
      desc: t("onboarding.step2Desc"),
      active: false,
    },
    {
      num: 3,
      title: t("onboarding.step3Title"),
      desc: t("onboarding.step3Desc"),
      active: false,
    },
  ];

  return (
    <div className="border-border rounded-2xl border border-dashed overflow-hidden">
      {/* Top empty state */}
      <div className="flex flex-col items-center px-6 pt-8 pb-6 text-center gap-1">
        <div className="bg-muted mb-2 flex size-10 items-center justify-center rounded-xl">
          <Users className="text-muted-foreground size-5" />
        </div>
        <p className="text-muted-foreground text-sm font-medium">
          {t("onboarding.emptyTitle")}
        </p>
        <p className="text-muted-foreground/70 text-xs">
          {t("onboarding.emptyHint")}
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
          {t("onboarding.sub")}
        </p>

        {/* Steps */}
        <div className="mb-5">
          {steps.map((step, i) => (
            <div
              key={step.num}
              className={`flex items-start gap-2.5 py-2.5 ${i > 0 ? "border-t border-border" : ""}`}
            >
              <div
                className={`mt-0.5 flex size-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  step.active
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground border-border border-[1.5px]"
                }`}
              >
                {step.num}
              </div>
              <div className="flex-1">
                <p
                  className={`text-[13px] font-semibold leading-snug ${
                    step.active ? "text-foreground" : "text-muted-foreground font-medium"
                  }`}
                >
                  {step.title}
                </p>
                <p
                  className={`mt-0.5 text-[12px] leading-snug text-muted-foreground ${
                    step.active ? "" : "opacity-60"
                  }`}
                >
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Button asChild size="lg" className="w-full">
          <Link href="/dashboard/circles/new">
            {t("onboarding.cta")}
            <ArrowRight className="ml-2 size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
