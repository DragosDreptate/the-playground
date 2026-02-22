import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  Users,
  CalendarDays,
  Globe,
  MapPin,
  Crown,
} from "lucide-react";
import { HeroWordSwap } from "@/components/demo/hero-word-swap";
import { HeroTypewriter } from "@/components/demo/hero-typewriter";
import { HeroAnnotation } from "@/components/demo/hero-annotation";
import { HeroCycle } from "@/components/demo/hero-cycle";

const VARIANTS = {
  "hero-1": { label: "Word swap (fade vertical)", Component: HeroWordSwap },
  "hero-2": { label: "Typewriter erase & retype", Component: HeroTypewriter },
  "hero-3": { label: "Annotation inline", Component: HeroAnnotation },
  "hero-4": { label: "Texte cyclique (rotate loop)", Component: HeroCycle },
} as const;

type VariantKey = keyof typeof VARIANTS;

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((variant) => ({ variant }));
}

export default async function DemoVariantPage({
  params,
}: {
  params: Promise<{ variant: string }>;
}) {
  const { variant } = await params;

  if (!Object.keys(VARIANTS).includes(variant)) {
    notFound();
  }

  const key = variant as VariantKey;
  const { label, Component } = VARIANTS[key];
  const otherVariants = Object.entries(VARIANTS).filter(([k]) => k !== key);

  const t = await getTranslations("HomePage");
  const tCircle = await getTranslations("Circle");
  const tDashboard = await getTranslations("Dashboard");

  return (
    <>
      {/* Navigation banner */}
      <div className="border-b bg-muted/50 px-4 py-3">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 text-sm">
          <span className="font-semibold">{label}</span>
          <span className="text-muted-foreground">·</span>
          {otherVariants.map(([k, v]) => (
            <Link
              key={k}
              href={`/demo/${k}` as "/demo/hero-1"}
              className="text-primary hover:underline"
            >
              {v.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Hero section — same layout as homepage */}
      <section className="flex min-h-[calc(100vh-3.5rem-3rem)] items-center px-4">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-16">
          {/* LEFT — animated text */}
          <div className="flex-1 text-center lg:text-left">
            <Component />
            <p className="text-muted-foreground mt-6 max-w-md text-lg font-light lg:max-w-none">
              {t("heroSubtitle")}
            </p>
          </div>

          {/* RIGHT — iPhone mockup (3D tilt, always dark) */}
          <div
            className="flex shrink-0 justify-center lg:w-[300px]"
            style={{ perspective: "1200px" }}
          >
            <div
              className="w-[260px] lg:w-[300px]"
              style={{
                transform: "rotateY(-8deg) rotateX(2deg) rotateZ(1deg)",
                transformStyle: "preserve-3d",
              }}
            >
              <div className="relative overflow-hidden rounded-[2.5rem] border-[8px] border-white/10 bg-[#0c0a14] shadow-2xl dark:border-white/[0.08]">
                {/* Dynamic Island */}
                <div className="relative flex items-center justify-between px-6 pt-3 pb-1">
                  <span className="text-xs font-medium text-white/60">
                    19:00
                  </span>
                  <div className="absolute left-1/2 top-2 h-[22px] w-[80px] -translate-x-1/2 rounded-full bg-black" />
                  <div className="flex items-center gap-1 text-white/60">
                    <svg
                      viewBox="0 0 16 12"
                      fill="currentColor"
                      className="h-2.5 w-4"
                    >
                      <rect x="0" y="6" width="3" height="6" rx="0.5" />
                      <rect x="4.5" y="4" width="3" height="8" rx="0.5" />
                      <rect x="9" y="2" width="3" height="10" rx="0.5" />
                      <rect
                        x="13"
                        y="0"
                        width="3"
                        height="12"
                        rx="0.5"
                        opacity="0.3"
                      />
                    </svg>
                    <svg
                      viewBox="0 0 15 12"
                      fill="currentColor"
                      className="h-2.5 w-3.5"
                    >
                      <path d="M7.5 3.6a5.2 5.2 0 0 1 3.5 1.3l1.1-1.2A7 7 0 0 0 7.5 2a7 7 0 0 0-4.6 1.7L4 4.9a5.2 5.2 0 0 1 3.5-1.3z" />
                      <path d="M7.5 6.6c1 0 1.9.35 2.5.9l1.1-1.1A5 5 0 0 0 7.5 5a5 5 0 0 0-3.6 1.4L5 7.5c.7-.55 1.5-.9 2.5-.9z" />
                      <circle cx="7.5" cy="10" r="1.5" />
                    </svg>
                    <div className="flex h-3 w-6 items-center rounded-sm border border-white/20">
                      <div className="ml-px h-2 w-4 rounded-xs bg-white/70" />
                    </div>
                  </div>
                </div>

                {/* Circle page content */}
                <div className="px-4 pt-2 pb-6">
                  <h3 className="text-lg font-bold text-white lg:text-xl">
                    {t("mockupCircleName")}
                  </h3>

                  <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-pink-500">
                    {tCircle("detail.about")}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-white/60">
                    {t("mockupAboutText")}
                  </p>

                  <div className="my-3 h-px bg-white/10" />

                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-7 items-center justify-center rounded-full bg-pink-500/15">
                        <Globe className="size-3.5 text-pink-500" />
                      </div>
                      <div>
                        <p className="text-[10px] text-white/40">
                          {tCircle("detail.visibility")}
                        </p>
                        <p className="text-[11px] font-medium text-white">
                          {tCircle("detail.publicCircle")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-7 items-center justify-center rounded-full bg-pink-500/15">
                        <Users className="size-3.5 text-pink-500" />
                      </div>
                      <div>
                        <p className="text-[10px] text-white/40">
                          {tCircle("detail.members")}
                        </p>
                        <p className="text-[11px] font-medium text-white">
                          {tCircle("detail.memberCount", { count: 12 })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-7 items-center justify-center rounded-full bg-pink-500/15">
                        <CalendarDays className="size-3.5 text-pink-500" />
                      </div>
                      <div>
                        <p className="text-[10px] text-white/40">
                          {tCircle("detail.created")}
                        </p>
                        <p className="text-[11px] font-medium text-white">
                          {t("mockupCreatedDate")}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <div className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-medium text-white">
                      {tCircle("detail.upcomingMoments")}
                    </div>
                    <div className="text-[10px] text-white/30">
                      {tCircle("detail.pastMoments")}
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2.5">
                    <div className="flex flex-col items-center pt-0.5">
                      <span className="text-[9px] text-pink-500">
                        {t("mockupMomentDay")}
                      </span>
                      <span className="text-[11px] font-bold text-white">
                        {t("mockupMomentDate")}
                      </span>
                      <div className="mt-1 size-1.5 rounded-full bg-pink-500" />
                      <div className="mt-1 h-12 w-px border-l border-dashed border-white/10" />
                    </div>
                    <div className="flex flex-1 gap-2 rounded-lg bg-white/5 p-2.5">
                      <div className="flex-1">
                        <span className="text-[10px] text-pink-500">
                          {t("mockupMomentTime")}
                        </span>
                        <p className="mt-0.5 text-[11px] font-semibold text-white">
                          {t("mockupMomentTitle")}
                        </p>
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-white/40">
                          <MapPin className="size-2.5" />
                          {t("mockupMomentLocation")}
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-white/40">
                          <Users className="size-2.5" />
                          {t("mockupMomentAttendees")}
                        </div>
                        <div className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-pink-500/30 px-1.5 py-0.5 text-[9px] text-pink-500">
                          <Crown className="size-2" />
                          {tDashboard("role.host")}
                        </div>
                      </div>
                      <div
                        className="size-12 shrink-0 self-start rounded-lg"
                        style={{
                          background:
                            "linear-gradient(135deg, #f43f5e, #a21caf)",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
