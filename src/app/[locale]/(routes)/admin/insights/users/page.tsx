import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prismaAdminRepository } from "@/infrastructure/repositories";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { PeriodSelector } from "@/components/admin/period-selector";
import { SortableTableHead } from "@/components/admin/sortable-table-head";
import { SparklineChart } from "@/components/admin/sparkline-chart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 20;
const BASE = "/admin/insights/users";

type Props = {
  searchParams: Promise<{ days?: string; page?: string; sort?: string; order?: string }>;
};

export default async function AdminInsightUsersPage({ searchParams }: Props) {
  const params = await searchParams;
  const days = Number(params.days ?? "30");
  const page = Number(params.page ?? "1");
  const sort = params.sort;
  const order = params.order === "asc" ? "asc" : "desc";
  const offset = (page - 1) * PAGE_SIZE;

  const sortParams: Record<string, string> = { days: String(days) };

  const [timeSeries, users, total] = await Promise.all([
    prismaAdminRepository.getTimeSeries(days),
    prismaAdminRepository.findAllUsers({ limit: PAGE_SIZE, offset, sortBy: sort, sortOrder: order }),
    prismaAdminRepository.countUsers({}),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Dashboard
          </Link>
          <h1 className="text-2xl font-bold">Nouveaux utilisateurs</h1>
        </div>
        <PeriodSelector currentDays={days} basePath={BASE} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Tendance — {days} derniers jours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SparklineChart data={timeSeries.users} id="insight-users" height={120} />
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead label="Nom" column="name" currentSort={sort} currentOrder={order} basePath={BASE} params={sortParams} />
              <SortableTableHead label="Email" column="email" currentSort={sort} currentOrder={order} basePath={BASE} params={sortParams} />
              <SortableTableHead label="Rôle" column="role" currentSort={sort} currentOrder={order} basePath={BASE} params={sortParams} />
              <SortableTableHead label="Communautés" column="circleCount" currentSort={sort} currentOrder={order} basePath={BASE} params={sortParams} className="text-right" />
              <SortableTableHead label="Inscriptions" column="momentCount" currentSort={sort} currentOrder={order} basePath={BASE} params={sortParams} className="text-right" />
              <SortableTableHead label="Inscrit le" column="createdAt" currentSort={sort} currentOrder={order} basePath={BASE} params={sortParams} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Aucun utilisateur
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
                    {user.createdAt.toLocaleDateString("fr-FR")}
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
