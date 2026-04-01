import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCachedSession } from "@/lib/auth-cache";
import { prisma } from "@/infrastructure/db/prisma";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { PwaRedirect } from "@/components/pwa-redirect";
import { PwaInstallSection } from "@/components/pwa-install-section";
import {
  Users,
  CalendarDays,
  TrendingUp,
  Link as LinkIcon,
  Sparkles,
  Gift,
} from "lucide-react";

// Pas de revalidate statique — la page redirige dynamiquement les utilisateurs connectés
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("HomePage");
  const description = t("heroSubtitle");
  return {
    title: "The Playground — Lancez votre communauté, organisez vos événements",
    description,
    openGraph: {
      title: "The Playground — Lancez votre communauté, organisez vos événements",
      description,
      siteName: "The Playground",
      images: [
        {
          url: "/hero-phone.png",
          width: 1241,
          height: 1453,
          alt: "The Playground — application mobile",
        },
      ],
    },
    twitter: {
      title: "The Playground — Lancez votre communauté, organisez vos événements",
      description,
      images: ["/hero-phone.png"],
    },
  };
}

type Props = {
  searchParams: Promise<{ home?: string }>;
};

export default async function HomePage({ searchParams }: Props) {
  const session = await getCachedSession();
  const t = await getTranslations("HomePage");

  // Redirect connectés vers Explorer ou Dashboard (sauf clic logo → ?home)
  const { home } = await searchParams;
  if (session?.user?.id && home === undefined) {
    const membershipCount = await prisma.circleMembership.count({
      where: { userId: session.user.id },
    });
    redirect(membershipCount > 0 ? "/dashboard" : "/explorer");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.the-playground.fr";

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "The Playground",
            url: appUrl,
            description:
              "La plateforme gratuite pour créer votre communauté et organiser des événements mémorables.",
            image: `${appUrl}/hero-phone.png`,
          }),
        }}
      />
      <PwaRedirect isLoggedIn={!!session?.user?.id} />
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="flex min-h-[calc(100vh-3.5rem)] items-center px-4 pb-16 md:pb-0">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-10 lg:flex-row lg:items-center lg:gap-4">
            {/* LEFT — text */}
            <div className="flex-1 text-center lg:-translate-y-12 lg:text-left">
              <h1 className="text-3xl leading-[1.3] font-medium tracking-tighter md:text-4xl lg:text-[2.75rem]">
                <span className="block md:whitespace-nowrap">
                  <span className="block bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 bg-clip-text font-bold text-transparent md:inline">
                    {t("heroHighlight1")}
                  </span>
                  <span className="md:ml-3">{t("heroRest1")}</span>
                </span>
                <span className="block md:whitespace-nowrap">
                  <span className="block bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 bg-clip-text font-bold text-transparent md:inline">
                    {t("heroHighlight2")}
                  </span>
                  <span className="md:ml-3">{t("heroRest2")}</span>
                </span>
                <span className="block md:whitespace-nowrap">
                  <span className="block bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 bg-clip-text font-bold text-transparent md:inline">
                    {t("heroHighlight3")}
                  </span>
                  <span className="md:ml-3">{t("heroRest3")}</span>
                </span>
              </h1>
              <p className="text-muted-foreground mt-6 max-w-md text-lg font-light lg:max-w-none">
                {t("heroSubtitle")}
              </p>
              <Button asChild size="lg" className="mt-10 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 px-8 py-6 text-base text-white hover:opacity-90">
                <Link href={session?.user ? "/dashboard/circles/new" : "/auth/sign-in"}>{t("cta")}</Link>
              </Button>
            </div>

            {/* RIGHT — iPhone mockup illustration (desktop only) */}
            <div className="hidden shrink-0 justify-center lg:flex lg:w-[700px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/hero-phone.png"
                alt="The Playground sur mobile"
                className="w-full max-w-[480px] drop-shadow-2xl lg:-translate-x-24"
                draggable={false}
              />
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
                      {t("stepLabel")} {step}
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
              <Link href={session?.user ? "/dashboard/circles/new" : "/auth/sign-in"}>{t("ctaFinal")}</Link>
            </Button>
          </div>
        </section>

        {/* PWA — télécharger l'app (iOS + Android) */}
        <PwaInstallSection />

        {/* Contact */}
        <section className="bg-muted/60 px-4 py-16">
          <div className="mx-auto flex max-w-lg flex-col items-center text-center">
            <h2 className="text-xl font-bold tracking-tight">
              {t("contactTitle")}
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              {t("contactSubtitle")}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-6">
              <Link href="/contact">{t("contactCta")}</Link>
            </Button>
            <p className="text-muted-foreground mt-3 text-xs">
              {t("contactHelpPrefix")}{" "}
              <Link href="/help" className="underline underline-offset-2 hover:text-foreground transition-colors">
                {t("contactHelpLink")}
              </Link>{" "}
              {t("contactHelpSuffix")}
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
