import { getTranslations } from "next-intl/server";
import {
  prismaCircleRepository,
  prismaMomentRepository,
  prismaRegistrationRepository,
} from "@/infrastructure/repositories";
import { auth } from "@/infrastructure/auth/auth.config";
import { getPublicCircles } from "@/domain/usecases/get-public-circles";
import { getPublicUpcomingMoments } from "@/domain/usecases/get-public-upcoming-moments";
import { ExplorerFilterBar } from "@/components/explorer/explorer-filter-bar";
import { ExplorerCreateButton } from "@/components/explorer/explorer-create-button";
import { ExplorerGrid } from "@/components/explorer/explorer-grid";
import { Link } from "@/i18n/navigation";
import type { CircleCategory, CircleMemberRole } from "@/domain/models/circle";
import type { RegistrationStatus } from "@/domain/models/registration";

const PAGE_SIZE = 12;
const FETCH_SIZE = PAGE_SIZE + 1;

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
  const session = await auth();

  // Fetch only the active tab to avoid over-fetching
  const [circlesRaw, momentsRaw, userCircles] = await Promise.all([
    activeTab === "circles"
      ? getPublicCircles(
          { category, limit: FETCH_SIZE },
          { circleRepository: prismaCircleRepository }
        )
      : Promise.resolve([]),
    activeTab === "moments"
      ? getPublicUpcomingMoments(
          { category, limit: FETCH_SIZE },
          { momentRepository: prismaMomentRepository }
        )
      : Promise.resolve([]),
    session?.user?.id
      ? prismaCircleRepository.findAllByUserId(session.user.id)
      : Promise.resolve([]),
  ]);

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
          <ExplorerGrid
            key={`circles-${category ?? "all"}`}
            tab="circles"
            initialItems={circles}
            initialHasMore={circlesHasMore}
            membershipRoleMap={membershipRoleMap}
            category={category}
          />
        )
      ) : moments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <p className="text-muted-foreground text-sm">{t("empty.moments")}</p>
        </div>
      ) : (
        <ExplorerGrid
          key={`moments-${category ?? "all"}`}
          tab="moments"
          initialItems={moments}
          initialHasMore={momentsHasMore}
          registrationStatusMap={registrationStatusMap}
          membershipBySlug={membershipBySlug}
          category={category}
        />
      )}
    </div>
  );
}
