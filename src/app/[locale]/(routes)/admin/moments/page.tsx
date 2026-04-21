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

const PAGE_SIZE = 20;
const BASE = "/admin/moments";

function statusVariant(status: string) {
  switch (status) {
    case "PUBLISHED":
      return "default" as const;
    case "CANCELLED":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
}

type Props = {
  searchParams: Promise<{ search?: string; page?: string; sort?: string; order?: string }>;
};

export default async function AdminMomentsPage({ searchParams }: Props) {
  const params = await searchParams;
  const t = await getTranslations("Admin");
  const tStatus = await getTranslations("Moment.status");
  const search = params.search ?? undefined;
  const page = Number(params.page ?? "1");
  const sort = params.sort;
  const order = params.order === "asc" ? "asc" : "desc";
  const offset = (page - 1) * PAGE_SIZE;

  const sortParams: Record<string, string> = { ...(search ? { search } : {}) };
  const SH = ({ label, column, className }: { label: string; column: string; className?: string }) => (
    <SortableTableHead label={label} column={column} currentSort={sort} currentOrder={order} basePath={BASE} params={sortParams} className={className} />
  );

  const [moments, total] = await Promise.all([
    prismaAdminRepository.findAllMoments({ search, limit: PAGE_SIZE, offset, sortBy: sort, sortOrder: order }),
    prismaAdminRepository.countMoments({ search }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("moments")}</h1>

      <AdminSearch />

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SH label={t("columns.title")} column="title" />
              <SH label={t("columns.circle")} column="circleName" />
              <SH label={t("columns.date")} column="startsAt" className="w-px" />
              <SH label={t("columns.status")} column="status" className="w-px" />
              <SH label={t("columns.registrations")} column="registrationCount" className="w-px text-right" />
              <SH label={t("columns.comments")} column="commentCount" className="w-px text-right" />
              <SH label={t("columns.createdAt")} column="createdAt" className="w-px" />
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {moments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  {t("table.noResults")}
                </TableCell>
              </TableRow>
            ) : (
              moments.map((moment) => (
                <TableRow key={moment.id}>
                  <TableCell>
                    <Link
                      href={`/admin/moments/${moment.id}`}
                      className="font-medium link-hover"
                    >
                      {moment.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{moment.circleName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {moment.startsAt.toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(moment.status)}>
                      {tStatus(moment.status.toLowerCase() as "published" | "cancelled" | "past")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {moment.registrationCount}
                    {moment.capacity ? `/${moment.capacity}` : ""}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {moment.commentCount}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {moment.createdAt.toLocaleDateString()}
                  </TableCell>
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
