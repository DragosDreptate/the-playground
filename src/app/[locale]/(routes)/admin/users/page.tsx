import { getTranslations } from "next-intl/server";
import Link from "next/link";
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
const BASE = "/admin/users";

type Props = {
  searchParams: Promise<{ search?: string; page?: string; sort?: string; order?: string }>;
};

export default async function AdminUsersPage({ searchParams }: Props) {
  const params = await searchParams;
  const t = await getTranslations("Admin");
  const search = params.search ?? undefined;
  const page = Number(params.page ?? "1");
  const sort = params.sort;
  const order = params.order === "asc" ? "asc" : "desc";
  const offset = (page - 1) * PAGE_SIZE;

  const sortParams: Record<string, string> = { ...(search ? { search } : {}) };

  const [users, total] = await Promise.all([
    prismaAdminRepository.findAllUsers({ search, limit: PAGE_SIZE, offset, sortBy: sort, sortOrder: order }),
    prismaAdminRepository.countUsers({ search }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("users")}</h1>

      <AdminSearch />

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead label={t("columns.name")} column="name" currentSort={sort} currentOrder={order} basePath={BASE} params={sortParams} />
              <SortableTableHead label={t("columns.email")} column="email" currentSort={sort} currentOrder={order} basePath={BASE} params={sortParams} />
              <SortableTableHead label={t("columns.role")} column="role" currentSort={sort} currentOrder={order} basePath={BASE} params={sortParams} />
              <SortableTableHead label={t("columns.circles")} column="circleCount" currentSort={sort} currentOrder={order} basePath={BASE} params={sortParams} className="text-right" />
              <SortableTableHead label={t("columns.moments")} column="momentCount" currentSort={sort} currentOrder={order} basePath={BASE} params={sortParams} className="text-right" />
              <SortableTableHead label={t("columns.createdAt")} column="createdAt" currentSort={sort} currentOrder={order} basePath={BASE} params={sortParams} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  {t("table.noResults")}
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="font-medium hover:underline"
                    >
                      {[user.firstName, user.lastName].filter(Boolean).join(" ") || "—"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    {user.role === "ADMIN" ? (
                      <Badge variant="default">Admin</Badge>
                    ) : (
                      <Badge variant="secondary">User</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{user.circleCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{user.momentCount}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.createdAt.toLocaleDateString()}
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
