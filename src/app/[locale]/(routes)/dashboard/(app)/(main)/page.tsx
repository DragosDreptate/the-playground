import { Suspense } from "react";
import { auth } from "@/infrastructure/auth/auth.config";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardContent } from "./_components/dashboard-content";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = tab === "circles" ? "circles" : "moments";

  const [session, t] = await Promise.all([auth(), getTranslations("Dashboard")]);

  if (!session?.user?.id) {
    return null;
  }

  const firstName = session.user.name?.split(" ")[0];

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Greeting — rendu immédiatement (session cookie uniquement) */}
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">
          {firstName
            ? t("greeting", { name: firstName })
            : t("greetingAnonymous")}
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed">
          {t("greetingSubtitle")}
        </p>
      </div>

      {/* Tab selector — rendu immédiatement */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 rounded-full border p-1">
          <Link
            href="?tab=moments"
            className={`flex-1 rounded-full px-4 py-1 text-center text-sm font-medium transition-colors sm:flex-none ${
              activeTab === "moments"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("myMoments")}
          </Link>
          <Link
            href="?tab=circles"
            className={`flex-1 rounded-full px-4 py-1 text-center text-sm font-medium transition-colors sm:flex-none ${
              activeTab === "circles"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("myCircles")}
          </Link>
        </div>
        {activeTab === "circles" && (
          <div className="sm:contents">
            <Button asChild size="sm" className="w-full sm:w-auto">
              <Link href="/dashboard/circles/new">{t("createCircle")}</Link>
            </Button>
          </div>
        )}
      </div>

      {/* Contenu — streamé en arrière-plan pendant que le shell s'affiche */}
      <Suspense fallback={<DashboardContentSkeleton />}>
        <DashboardContent userId={session.user.id} activeTab={activeTab} />
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
