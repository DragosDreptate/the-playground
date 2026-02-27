import { Suspense } from "react";
import { auth } from "@/infrastructure/auth/auth.config";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardContent } from "./_components/dashboard-content";
import { DashboardModeSwitcher } from "@/components/dashboard/dashboard-mode-switcher";
import type { DashboardMode } from "@/domain/models/user";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; mode?: string }>;
}) {
  const { tab, mode: modeParam } = await searchParams;
  const activeTab = tab === "circles" ? "circles" : "moments";

  const [session, t] = await Promise.all([auth(), getTranslations("Dashboard")]);

  if (!session?.user?.id) {
    return null;
  }

  // Résolution du mode actif : searchParams > session.dashboardMode > null
  const sessionMode = session.user.dashboardMode ?? null;
  const resolvedMode: DashboardMode | null =
    modeParam === "organizer"
      ? "ORGANIZER"
      : modeParam === "participant"
        ? "PARTICIPANT"
        : sessionMode;

  const firstName = session.user.name?.split(" ")[0];

  const modeLabel =
    resolvedMode === "ORGANIZER"
      ? t("modeOrganizer")
      : resolvedMode === "PARTICIPANT"
        ? t("modeParticipant")
        : null;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header : greeting + mode switcher */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="text-3xl font-bold tracking-tight leading-tight">
            <span className="block">
              {firstName
                ? t("greeting", { name: firstName })
                : t("greetingAnonymous")}
            </span>
            {modeLabel && (
              <span className="text-primary block">{modeLabel}</span>
            )}
          </h1>
          <div className="shrink-0">
            <DashboardModeSwitcher currentMode={resolvedMode} activeTab={activeTab} />
          </div>
        </div>
        <p className="text-muted-foreground text-base leading-relaxed">
          {resolvedMode === "ORGANIZER"
            ? t("greetingSubtitleOrganizer")
            : t("greetingSubtitle")}
        </p>
      </div>

      {/* Tab selector + CTA conditionnel */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 rounded-full border p-1">
          <Link
            href={`?tab=moments${resolvedMode ? `&mode=${resolvedMode.toLowerCase()}` : ""}`}
            className={`flex-1 rounded-full px-4 py-1 text-center text-sm font-medium transition-colors sm:flex-none ${
              activeTab === "moments"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {resolvedMode === "ORGANIZER" ? t("myMomentsOrganizer") : t("myMoments")}
          </Link>
          <Link
            href={`?tab=circles${resolvedMode ? `&mode=${resolvedMode.toLowerCase()}` : ""}`}
            className={`flex-1 rounded-full px-4 py-1 text-center text-sm font-medium transition-colors sm:flex-none ${
              activeTab === "circles"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {resolvedMode === "ORGANIZER" ? t("myCirclesOrganizer") : t("myCircles")}
          </Link>
        </div>

        {resolvedMode === "ORGANIZER" && (
          <div className="sm:contents">
            {activeTab === "moments" ? (
              <Button asChild size="sm" className="w-full sm:w-auto">
                <Link href="/dashboard/moments/new">{t("createMoment")}</Link>
              </Button>
            ) : (
              <Button asChild size="sm" className="w-full sm:w-auto">
                <Link href="/dashboard/circles/new">{t("createCircle")}</Link>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Contenu — streamé en arrière-plan pendant que le shell s'affiche */}
      <Suspense fallback={<DashboardContentSkeleton />}>
        <DashboardContent
          userId={session.user.id}
          activeTab={activeTab}
          mode={resolvedMode}
        />
      </Suspense>
    </div>
  );
}

function DashboardContentSkeleton() {
  return (
    <div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-0 py-3">
          <div className="w-[100px] shrink-0 pr-4">
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex shrink-0 flex-col items-center">
            <Skeleton className="size-2.5 rounded-full" />
          </div>
          <div className="min-w-0 flex-1 pl-4 pb-4">
            <Skeleton className="h-[76px] w-full rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
