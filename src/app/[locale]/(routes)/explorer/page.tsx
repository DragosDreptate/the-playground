import { getTranslations } from "next-intl/server";
import {
  prismaCircleRepository,
  prismaMomentRepository,
  prismaRegistrationRepository,
} from "@/infrastructure/repositories";
import { measureTime } from "@/lib/perf-logger";

// Revalide toutes les 5 minutes — la page Découvrir ne nécessite pas un temps réel strict.
// Les filtres par catégorie + onglets sont gérés côté SSR via searchParams.
export const revalidate = 300;
import { getCachedSession } from "@/lib/auth-cache";
import { getPublicCircles } from "@/domain/usecases/get-public-circles";
import { getPublicUpcomingMoments } from "@/domain/usecases/get-public-upcoming-moments";
import { getFeaturedCircles } from "@/domain/usecases/get-featured-circles";
import { getSiteSettings } from "@/domain/usecases/get-site-settings";
import { prismaSiteSettingsRepository } from "@/infrastructure/repositories";
import { ExplorerFilterBar } from "@/components/explorer/explorer-filter-bar";
import { ExplorerFeatured } from "@/components/explorer/explorer-featured";
import { ExplorerGrid } from "@/components/explorer/explorer-grid";
import { Link } from "@/i18n/navigation";
import type { CircleCategory, CircleMemberRole } from "@/domain/models/circle";
import type { ExplorerSortBy } from "@/domain/ports/repositories/circle-repository";
import type { RegistrationStatus } from "@/domain/models/registration";

const PAGE_SIZE = 10;
const FETCH_SIZE = PAGE_SIZE + 1;

export async function generateMetadata() {
  const t = await getTranslations("Explorer");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `${appUrl}/explorer`,
      languages: {
        fr: `${appUrl}/explorer`,
        en: `${appUrl}/en/explorer`,
      },
    },
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
  searchParams: Promise<{ tab?: string; category?: string; sortBy?: string }>;
}) {
  const { tab, category: categoryParam, sortBy: sortByParam } = await searchParams;
  const activeTab = tab === "moments" ? "moments" : "circles";
  const category = categoryParam as CircleCategory | undefined;
  const defaultSort: ExplorerSortBy = activeTab === "moments" ? "date" : "popular";
  const VALID_SORTS: ExplorerSortBy[] = ["date", "popular", "members"];
  const sortBy: ExplorerSortBy = VALID_SORTS.includes(sortByParam as ExplorerSortBy)
    ? (sortByParam as ExplorerSortBy)
    : defaultSort;

  const t = await getTranslations("Explorer");
  const session = await getCachedSession();
  const siteSettings = await getSiteSettings({
    siteSettingsRepository: prismaSiteSettingsRepository,
  });
  const showFeatured = activeTab === "circles" && siteSettings.featuredCirclesEnabled;

  // Fetch only the active tab to avoid over-fetching
  const [circlesRaw, momentsRaw, userCircles, featuredCircles] = await measureTime(
    "explorer:data",
    () =>
      Promise.all([
        activeTab === "circles"
          ? getPublicCircles(
              { category, sortBy, limit: FETCH_SIZE },
              { circleRepository: prismaCircleRepository }
            )
          : Promise.resolve([]),
        activeTab === "moments"
          ? getPublicUpcomingMoments(
              { category, sortBy, limit: FETCH_SIZE },
              { momentRepository: prismaMomentRepository }
            )
          : Promise.resolve([]),
        session?.user?.id
          ? prismaCircleRepository.findAllByUserId(session.user.id)
          : Promise.resolve([]),
        showFeatured
          ? getFeaturedCircles({ circleRepository: prismaCircleRepository })
          : Promise.resolve([]),
      ])
  );

  // Over-fetch pattern: fetch FETCH_SIZE, display PAGE_SIZE
  const circlesHasMore = circlesRaw.length > PAGE_SIZE;
  const circles = circlesHasMore ? circlesRaw.slice(0, PAGE_SIZE) : circlesRaw;

  const momentsHasMore = momentsRaw.length > PAGE_SIZE;
  const moments = momentsHasMore ? momentsRaw.slice(0, PAGE_SIZE) : momentsRaw;

  // Membership maps
  const membershipRoleMap: Record<string, CircleMemberRole> = {};
  const membershipBySlug: Record<string, CircleMemberRole> = {};
  for (const c of userCircles) {
    membershipRoleMap[c.id] = c.memberRole;
    membershipBySlug[c.slug] = c.memberRole;
  }

  // Registration statuses for moment cards
  const registrationStatusMap: Record<string, RegistrationStatus | null> = {};
  if (session?.user?.id && moments.length > 0) {
    const regMap = await prismaRegistrationRepository.findByMomentIdsAndUser(
      moments.map((m) => m.id),
      session.user.id
    );
    for (const [momentId, reg] of regMap) {
      registrationStatusMap[momentId] = reg?.status ?? null;
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-l-[3px] border-primary pl-5">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground text-base leading-relaxed">{t("description")}</p>
      </div>

      {/* À la une */}
      <ExplorerFeatured circles={featuredCircles} />

      {/* Tabs + filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 rounded-full border p-1 w-fit">
          {(["circles", "moments"] as const).map((tabKey) => {
            const params = new URLSearchParams();
            if (tabKey !== "circles") params.set("tab", tabKey);
            if (category) params.set("category", category);
            // Sort resets to tab default when switching tabs
            const href = params.size > 0 ? `?${params.toString()}` : "?";
            return (
              <Link
                key={tabKey}
                href={href}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === tabKey
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t(`tabs.${tabKey}`)}
              </Link>
            );
          })}
        </div>
        <ExplorerFilterBar selectedCategory={category} sortBy={sortBy} activeTab={activeTab} />
      </div>

      {/* Content */}
      {activeTab === "circles" ? (
        circles.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
            <p className="text-muted-foreground text-sm">{t("empty.circles")}</p>
          </div>
        ) : (
          <ExplorerGrid
            key={`circles-${category ?? "all"}-${sortBy}`}
            tab="circles"
            initialItems={circles}
            initialHasMore={circlesHasMore}
            membershipRoleMap={membershipRoleMap}
            category={category}
            sortBy={sortBy}
          />
        )
      ) : moments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <p className="text-muted-foreground text-sm">{t("empty.moments")}</p>
        </div>
      ) : (
        <ExplorerGrid
          key={`moments-${category ?? "all"}-${sortBy}`}
          tab="moments"
          initialItems={moments}
          initialHasMore={momentsHasMore}
          registrationStatusMap={registrationStatusMap}
          membershipBySlug={membershipBySlug}
          category={category}
          sortBy={sortBy}
        />
      )}
    </div>
  );
}
