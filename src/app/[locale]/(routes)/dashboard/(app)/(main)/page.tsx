import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/auth-cache";
import { getTranslations } from "next-intl/server";
import { measureTime } from "@/lib/perf-logger";
import { Link } from "@/i18n/navigation";
import { DashboardContent } from "./_components/dashboard-content";
import { DashboardCommunitiesSkeleton } from "./_components/dashboard-communities-skeleton";
import { DashboardTimelineSkeleton } from "./_components/dashboard-timeline-skeleton";
import { DashboardFilterBar } from "./_components/dashboard-filter-bar";
import { CreateMomentButton } from "@/components/dashboard/create-moment-button";
import { CreateCircleButton } from "@/components/dashboard/create-circle-button";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; host?: string }>;
}) {
  const { tab, host } = await searchParams;
  const activeTab = tab === "circles" ? "circles" : "moments";
  const hostOnly = host === "true";

  const [session, t] = await Promise.all([
    measureTime("dashboard:auth", () => getCachedSession()),
    getTranslations("Dashboard"),
  ]);

  if (!session?.user?.id) {
    return null;
  }

  // Redirect vers welcome si le mode n'a jamais été choisi (= nouvel utilisateur)
  if (session.user.dashboardMode === null) {
    redirect("/dashboard/welcome");
  }

  const firstName = session.user.name?.split(" ")[0];

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <div className="border-l-[3px] border-primary pl-5">
        <h1 className="text-3xl font-bold tracking-tight">
          {firstName
            ? t("greeting", { name: firstName })
            : t("greetingAnonymous")}
        </h1>
        <p className="mt-2 text-muted-foreground text-base leading-relaxed">
          {t("greetingSubtitle")}
        </p>
      </div>

      {/* Tab selector + filter + CTA */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full items-center gap-1 rounded-full border p-1 sm:w-auto">
          <Link
            href={`?tab=moments${hostOnly ? "&host=true" : ""}`}
            className={`flex-1 rounded-full px-4 py-1 text-center text-sm font-medium transition-colors sm:flex-none ${
              activeTab === "moments"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("myMoments")}
          </Link>
          <Link
            href={`?tab=circles${hostOnly ? "&host=true" : ""}`}
            className={`flex-1 rounded-full px-4 py-1 text-center text-sm font-medium transition-colors sm:flex-none ${
              activeTab === "circles"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("myCircles")}
          </Link>
        </div>

        <Suspense>
          <DashboardFilterBar hostOnly={hostOnly} activeTab={activeTab} userId={session.user.id} />
        </Suspense>

        <Suspense>
          {activeTab === "moments" ? (
            <CreateMomentButton />
          ) : (
            <CreateCircleButton />
          )}
        </Suspense>
      </div>

      {/* Contenu — streamé en arrière-plan pendant que le shell s'affiche */}
      <Suspense
        fallback={
          activeTab === "circles" ? (
            <DashboardCommunitiesSkeleton />
          ) : (
            <DashboardTimelineSkeleton />
          )
        }
      >
        <DashboardContent
          userId={session.user.id}
          activeTab={activeTab}
          hostOnly={hostOnly}
        />
      </Suspense>
    </div>
  );
}
