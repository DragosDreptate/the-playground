import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { prismaAdminRepository } from "@/infrastructure/repositories";
import { AdminSearch } from "@/components/admin/admin-search";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { SortableTableHead } from "@/components/admin/sortable-table-head";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExcludedToggle, OverrideScoreInput, RecalculateScoresButton } from "@/components/admin/explorer-controls";
import { FeaturedCirclesToggle } from "@/components/admin/featured-circles-toggle";
import { AdminExplorerTabs } from "@/components/admin/admin-explorer-tabs";
import type { ExplorerFilter } from "@/domain/ports/repositories/admin-repository";
import { getSiteSettings } from "@/domain/usecases/get-site-settings";
import { prismaSiteSettingsRepository } from "@/infrastructure/repositories";

const PAGE_SIZE = 20;
const BASE = "/admin/explorer";

type Props = {
  searchParams: Promise<{
    search?: string;
    page?: string;
    sort?: string;
    order?: string;
    filter?: string;
  }>;
};

export default async function AdminExplorerPage({ searchParams }: Props) {
  const params = await searchParams;
  const t = await getTranslations("Admin");
  const search = params.search ?? undefined;
  const page = Number(params.page ?? "1");
  const sort = params.sort;
  const order = params.order === "asc" ? "asc" : "desc";
  const filter: ExplorerFilter =
    params.filter === "excluded" || params.filter === "boosted" ? params.filter : "all";
  const offset = (page - 1) * PAGE_SIZE;

  const sortParams: Record<string, string> = {
    ...(search ? { search } : {}),
    ...(filter !== "all" ? { filter } : {}),
  };
  const SH = ({ label, column, className }: { label: string; column: string; className?: string }) => (
    <SortableTableHead
      label={label}
      column={column}
      currentSort={sort}
      currentOrder={order}
      basePath={BASE}
      params={sortParams}
      className={className}
    />
  );

  const [circles, total, siteSettings] = await Promise.all([
    prismaAdminRepository.findAllExplorerCircles({
      search,
      filter,
      limit: PAGE_SIZE,
      offset,
      sortBy: sort,
      sortOrder: order,
    }),
    prismaAdminRepository.countExplorerCircles({ search, filter }),
    getSiteSettings({ siteSettingsRepository: prismaSiteSettingsRepository }),
  ]);

  const filterHref = (f: ExplorerFilter) => {
    const qs = new URLSearchParams({ ...(f !== "all" ? { filter: f } : {}), ...(search ? { search } : {}) });
    return qs.size > 0 ? `${BASE}?${qs}` : BASE;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("explorer.title")}</h1>
        <RecalculateScoresButton />
      </div>

      <AdminExplorerTabs activeTab="circles" />

      <FeaturedCirclesToggle initialEnabled={siteSettings.featuredCirclesEnabled} />

      {/* Filtres */}
      <div className="flex gap-2">
        {(["all", "excluded", "boosted"] as ExplorerFilter[]).map((f) => (
          <Link
            key={f}
            href={filterHref(f)}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === f
                ? "bg-foreground text-background"
                : "hover:bg-muted text-muted-foreground"
            }`}
          >
            {t(`explorer.filter.${f}`)}
          </Link>
        ))}
      </div>

      <AdminSearch />

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SH label={t("columns.name")} column="name" />
              <TableHead>{t("columns.host")}</TableHead>
              <SH label={t("explorer.columns.score")} column="explorerScore" className="w-px text-right" />
              <TableHead className="w-px">{t("explorer.columns.override")}</TableHead>
              <TableHead className="w-px text-center">{t("explorer.columns.visible")}</TableHead>
              <TableHead className="w-px text-center">{t("explorer.columns.demo")}</TableHead>
              <SH label={t("columns.members")} column="memberCount" className="w-px text-right" />
              <SH label={t("columns.moments")} column="momentCount" className="w-px text-right" />
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {circles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  {t("table.noResults")}
                </TableCell>
              </TableRow>
            ) : (
              circles.map((circle) => (
                <TableRow key={circle.id} className={circle.excludedFromExplorer ? "opacity-50" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/circles/${circle.id}`}
                        className="font-medium hover:underline"
                      >
                        {circle.name}
                      </Link>
                      {circle.visibility === "PRIVATE" && (
                        <span className="rounded border border-muted-foreground/30 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {t("explorer.columns.private")}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{circle.hostName}</TableCell>
                  <TableCell className="text-right tabular-nums font-mono text-sm">
                    {circle.overrideScore !== null ? (
                      <span className="text-amber-600 font-semibold">{circle.overrideScore}</span>
                    ) : (
                      circle.explorerScore
                    )}
                  </TableCell>
                  <TableCell>
                    <OverrideScoreInput
                      circleId={circle.id}
                      overrideScore={circle.overrideScore}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <ExcludedToggle
                      circleId={circle.id}
                      excluded={circle.excludedFromExplorer}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    {circle.isDemo && (
                      <Badge variant="secondary" className="text-xs">{t("explorer.columns.demo")}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{circle.memberCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{circle.momentCount}</TableCell>
                  <TableCell>
                    <Link
                      href={`/circles/${circle.slug}`}
                      target="_blank"
                      className="text-muted-foreground hover:text-foreground"
                      title="Voir la page publique"
                    >
                      <ExternalLink className="size-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AdminPagination total={total} />
    </div>
  );
}
