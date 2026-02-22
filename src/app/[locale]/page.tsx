import { auth } from "@/infrastructure/auth/auth.config";
import { getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Users,
  CalendarDays,
  TrendingUp,
  Link as LinkIcon,
  Sparkles,
  Gift,
  Globe,
  MapPin,
  Crown,
} from "lucide-react";

export default async function HomePage() {
  const session = await auth();
  const t = await getTranslations("HomePage");
  const tCircle = await getTranslations("Circle");
  const tDashboard = await getTranslations("Dashboard");

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader user={session?.user} />

      <main className="flex-1">
        {/* Hero */}
        <section className="flex min-h-[calc(100vh-3.5rem)] items-center px-4">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-16">
            {/* LEFT — text */}
            <div className="flex-1 text-center lg:text-left">
              <h1 className="text-3xl leading-[1.3] font-medium tracking-tighter md:text-4xl lg:text-[2.75rem]">
                <span className="block whitespace-nowrap">
                  <span className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 bg-clip-text font-bold text-transparent">
                    {t("heroHighlight1")}
                  </span>{" "}
                  {t("heroRest1")}
                </span>
                <span className="block whitespace-nowrap">
                  <span className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 bg-clip-text font-bold text-transparent">
                    {t("heroHighlight2")}
                  </span>{" "}
                  {t("heroRest2")}
                </span>
                <span className="block whitespace-nowrap">
                  <span className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 bg-clip-text font-bold text-transparent">
                    {t("heroHighlight3")}
                  </span>{" "}
                  {t("heroRest3")}
                </span>
              </h1>
              <p className="text-muted-foreground mt-6 max-w-md text-lg font-light lg:max-w-none">
                {t("heroSubtitle")}
              </p>
              <Button asChild size="lg" className="mt-10 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 px-8 py-6 text-base text-white hover:opacity-90">
                <Link href="/auth/sign-in">{t("cta")}</Link>
              </Button>
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
                    {/* Circle name */}
                    <h3 className="text-lg font-bold text-white lg:text-xl">
                      {t("mockupCircleName")}
                    </h3>

                    {/* About */}
                    <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-pink-500">
                      {tCircle("detail.about")}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-white/60">
                      {t("mockupAboutText")}
                    </p>

                    {/* Divider */}
                    <div className="my-3 h-px bg-white/10" />

                    {/* Meta rows */}
                    <div className="space-y-2.5">
                      {/* Visibility */}
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
                      {/* Members */}
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
                      {/* Created */}
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

                    {/* Tabs */}
                    <div className="mt-4 flex items-center gap-2">
                      <div className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-medium text-white">
                        {tCircle("detail.upcomingMoments")}
                      </div>
                      <div className="text-[10px] text-white/30">
                        {tCircle("detail.pastMoments")}
                      </div>
                    </div>

                    {/* Timeline — Moment card */}
                    <div className="mt-3 flex gap-2.5">
                      {/* Date column */}
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
                      {/* Card */}
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
                        {/* Gradient thumbnail */}
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

        {/* Comment ça marche */}
        <section id="how-it-works" className="bg-muted/60 px-4 pt-16 pb-24 md:pt-20 md:pb-32">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-16 text-center text-3xl font-bold tracking-tight md:text-4xl">
              {t("howItWorks")}
            </h2>
            <div className="relative space-y-12">
              {/* Ligne verticale */}
              <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-pink-500 via-fuchsia-500 to-violet-500 opacity-20 md:left-8" />

              {[
                {
                  step: 1,
                  title: t("step1Title"),
                  description: t("step1Description"),
                  icon: Users,
                },
                {
                  step: 2,
                  title: t("step2Title"),
                  description: t("step2Description"),
                  icon: CalendarDays,
                },
                {
                  step: 3,
                  title: t("step3Title"),
                  description: t("step3Description"),
                  icon: TrendingUp,
                },
              ].map(({ step, title, description, icon: Icon }) => (
                <div key={step} className="relative flex gap-6 md:gap-8">
                  {/* Dot gradient */}
                  <div className="relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-violet-500 shadow-lg shadow-pink-500/20 md:size-16">
                    <Icon className="size-5 text-white md:size-6" />
                  </div>
                  {/* Contenu */}
                  <div className="pt-1 md:pt-3">
                    <p className="text-primary mb-1 text-xs font-semibold uppercase tracking-widest">
                      Étape {step}
                    </p>
                    <h3 className="text-xl font-bold md:text-2xl">{title}</h3>
                    <p className="text-muted-foreground mt-2 text-sm leading-relaxed md:text-base">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-16 flex justify-center">
              <Button asChild size="lg" className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 px-8 py-6 text-base text-white hover:opacity-90">
                <Link href="/explorer">{t("ctaExplore")}</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* 3 piliers */}
        <section className="px-4 py-24 md:py-32">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-16 text-center text-3xl font-bold tracking-tight md:text-4xl">
              {t("pillarsHeading")}
            </h2>
            <div className="grid gap-6 md:grid-cols-3 md:gap-8">
              {[
                {
                  title: t("pillar1Title"),
                  description: t("pillar1Description"),
                  icon: LinkIcon,
                },
                {
                  title: t("pillar2Title"),
                  description: t("pillar2Description"),
                  icon: Sparkles,
                },
                {
                  title: t("pillar3Title"),
                  description: t("pillar3Description"),
                  icon: Gift,
                },
              ].map(({ title, description, icon: Icon }) => (
                <div
                  key={title}
                  className="rounded-2xl border p-8 transition-colors hover:border-primary/30"
                >
                  <div className="mb-5 flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-violet-500 shadow-lg shadow-pink-500/20">
                    <Icon className="size-5 text-white" />
                  </div>
                  <h3 className="mb-2 text-xl font-bold">{title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed md:text-base">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="bg-muted/60 px-4 py-24 md:py-32">
          <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              {t("ctaFinalTitle")}
            </h2>
            <p className="text-muted-foreground mt-4 text-lg">
              {t("ctaFinalSubtitle")}
            </p>
            <Button asChild size="lg" className="mt-8 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 px-8 py-6 text-base text-white hover:opacity-90">
              <Link href="/auth/sign-in">{t("ctaFinal")}</Link>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
