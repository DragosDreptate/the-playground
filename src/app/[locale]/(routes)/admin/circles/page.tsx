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
const BASE = "/admin/circles";

type Props = {
  searchParams: Promise<{ search?: string; page?: string; sort?: string; order?: string }>;
};

export default async function AdminCirclesPage({ searchParams }: Props) {
  const params = await searchParams;
  const t = await getTranslations("Admin");
  const tCat = await getTranslations("CircleCategory");
  const search = params.search ?? undefined;
  const page = Number(params.page ?? "1");
  const sort = params.sort;
  const order = params.order === "asc" ? "asc" : "desc";
  const offset = (page - 1) * PAGE_SIZE;

  const sortParams: Record<string, string> = { ...(search ? { search } : {}) };
  const SH = ({ label, column, className }: { label: string; column: string; className?: string }) => (
    <SortableTableHead label={label} column={column} currentSort={sort} currentOrder={order} basePath={BASE} params={sortParams} className={className} />
  );

  const [circles, total] = await Promise.all([
    prismaAdminRepository.findAllCircles({ search, limit: PAGE_SIZE, offset, sortBy: sort, sortOrder: order }),
    prismaAdminRepository.countCircles({ search }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("circles")}</h1>

      <AdminSearch />

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SH label={t("columns.name")} column="name" />
              <TableHead>{t("columns.host")}</TableHead>
              <SH label={t("columns.members")} column="memberCount" className="w-px text-right" />
              <SH label={t("columns.moments")} column="momentCount" className="w-px text-right" />
              <SH label={t("columns.visibility")} column="visibility" className="w-px" />
              <SH label={t("columns.category")} column="category" className="w-px" />
              <SH label={t("columns.createdAt")} column="createdAt" className="w-px" />
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {circles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  {t("table.noResults")}
                </TableCell>
              </TableRow>
            ) : (
              circles.map((circle) => (
                <TableRow key={circle.id}>
                  <TableCell>
                    <Link
                      href={`/admin/circles/${circle.id}`}
                      className="font-medium hover:underline"
                    >
                      {circle.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{circle.hostName}</TableCell>
                  <TableCell className="text-right tabular-nums">{circle.memberCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{circle.momentCount}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{circle.visibility}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {circle.category ? tCat(circle.category) : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {circle.createdAt.toLocaleDateString()}
                  </TableCell>
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
