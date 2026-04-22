import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { AdminExplorerTabs } from "@/components/admin/admin-explorer-tabs";
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

const PAGE_SIZE = 20;
const BASE = "/admin/explorer/moments";

type Props = {
  searchParams: Promise<{
    search?: string;
    page?: string;
    sort?: string;
    order?: string;
  }>;
};

export default async function AdminExplorerMomentsPage({ searchParams }: Props) {
  const params = await searchParams;
  const t = await getTranslations("Admin");
  const search = params.search ?? undefined;
  const page = Number(params.page ?? "1");
  const sort = params.sort;
  const order = params.order === "asc" ? "asc" : "desc";
  const offset = (page - 1) * PAGE_SIZE;

  const sortParams: Record<string, string> = search ? { search } : {};
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

  const [moments, total] = await Promise.all([
    prismaAdminRepository.findAllExplorerMoments({
      search,
      limit: PAGE_SIZE,
      offset,
      sortBy: sort,
      sortOrder: order,
    }),
    prismaAdminRepository.countExplorerMoments({ search }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("explorer.title")}</h1>

      <AdminExplorerTabs activeTab="moments" />

      <AdminSearch />

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SH label={t("columns.title")} column="title" />
              <TableHead>{t("columns.circle")}</TableHead>
              <SH label={t("explorer.columns.score")} column="explorerScore" className="w-px text-right" />
              <TableHead className="w-px text-center">{t("explorer.columns.demo")}</TableHead>
              <SH label={t("columns.startsAt")} column="startsAt" className="w-px text-right" />
              <SH label={t("columns.registrations")} column="registrationCount" className="w-px text-right" />
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {moments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  {t("table.noResults")}
                </TableCell>
              </TableRow>
            ) : (
              moments.map((moment) => (
                <TableRow key={moment.id}>
                  <TableCell>
                    <Link
                      href={`/admin/moments/${moment.id}`}
                      className="font-medium hover:text-primary dark:hover:text-[oklch(0.76_0.27_341)] transition-colors"
                    >
                      {moment.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    <Link href={`/admin/circles`} className="hover:text-primary dark:hover:text-[oklch(0.76_0.27_341)] transition-colors">
                      {moment.circleName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-mono text-sm">
                    {moment.explorerScore}
                  </TableCell>
                  <TableCell className="text-center">
                    {moment.isDemo && (
                      <Badge variant="secondary" className="text-xs">{t("explorer.columns.demo")}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
                    {moment.startsAt.toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{moment.registrationCount}</TableCell>
                  <TableCell>
                    <Link
                      href={`/m/${moment.slug}`}
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
