import { getTranslations } from "next-intl/server";
import {
  prismaCircleRepository,
  prismaMomentRepository,
} from "@/infrastructure/repositories";
import { getPublicCircles } from "@/domain/usecases/get-public-circles";
import { getPublicUpcomingMoments } from "@/domain/usecases/get-public-upcoming-moments";
import { PublicCircleCard } from "@/components/explorer/public-circle-card";
import { PublicMomentCard } from "@/components/explorer/public-moment-card";
import { ExplorerFilterBar } from "@/components/explorer/explorer-filter-bar";
import { ExplorerCreateButton } from "@/components/explorer/explorer-create-button";
import { Link } from "@/i18n/navigation";
import type { CircleCategory } from "@/domain/models/circle";

export const revalidate = 60;

export async function generateMetadata() {
  const t = await getTranslations("Explorer");
  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("title"),
      description: t("description"),
    },
    twitter: {
      title: t("title"),
      description: t("description"),
    },
  };
}

export default async function ExplorerPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; category?: string }>;
}) {
  const { tab, category: categoryParam } = await searchParams;
  const activeTab = tab === "moments" ? "moments" : "circles";
  const category = categoryParam as CircleCategory | undefined;

  const t = await getTranslations("Explorer");

  const [circles, moments] = await Promise.all([
    getPublicCircles(
      { category },
      { circleRepository: prismaCircleRepository }
    ),
    getPublicUpcomingMoments(
      { category },
      { momentRepository: prismaMomentRepository }
    ),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground text-base leading-relaxed">{t("description")}</p>
        </div>
        <ExplorerCreateButton />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-full border p-1 w-fit">
        <Link
          href={category ? `?tab=circles&category=${category}` : "?tab=circles"}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "circles"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("tabs.circles")}
        </Link>
        <Link
          href={category ? `?tab=moments&category=${category}` : "?tab=moments"}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "moments"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("tabs.moments")}
        </Link>
      </div>

      {/* Filter bar */}
      <ExplorerFilterBar selectedCategory={category} activeTab={activeTab} />

      {/* Content */}
      {activeTab === "circles" ? (
        circles.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
            <p className="text-muted-foreground text-sm">{t("empty.circles")}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {circles.map((circle) => (
              <PublicCircleCard key={circle.id} circle={circle} />
            ))}
          </div>
        )
      ) : moments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <p className="text-muted-foreground text-sm">{t("empty.moments")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {moments.map((moment) => (
            <PublicMomentCard key={moment.id} moment={moment} />
          ))}
        </div>
      )}
    </div>
  );
}
