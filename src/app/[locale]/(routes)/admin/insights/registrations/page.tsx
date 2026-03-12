import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { prismaAdminRepository } from "@/infrastructure/repositories";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { PeriodSelector } from "@/components/admin/period-selector";
import { SortableTableHead } from "@/components/admin/sortable-table-head";
import { SparklineChart } from "@/components/admin/sparkline-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 20;
const BASE = "/admin/insights/registrations";

type Props = {
  searchParams: Promise<{ days?: string; page?: string; sort?: string; order?: string }>;
};

export default async function AdminInsightRegistrationsPage({ searchParams }: Props) {
  const params = await searchParams;
  const days = Number(params.days ?? "30");
  const page = Number(params.page ?? "1");
  const sort = params.sort;
  const order = params.order === "asc" ? "asc" : "desc";
  const offset = (page - 1) * PAGE_SIZE;

  const sortParams: Record<string, string> = { days: String(days) };

  const [timeSeries, { registrations, total }] = await Promise.all([
    prismaAdminRepository.getTimeSeries(days),
    prismaAdminRepository.getRegistrationsInsight(days, PAGE_SIZE, offset, sort, order),
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
          <h1 className="text-2xl font-bold">Inscriptions</h1>
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
          <SparklineChart
            data={timeSeries.registrations}
            id="insight-registrations"
            height={120}
          />
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead label="Participant" column="userName" currentSort={sort} currentOrder={order} basePath={BASE} params={sortParams} />
              <SortableTableHead label="Email" column="userEmail" currentSort={sort} currentOrder={order} basePath={BASE} params={sortParams} />
              <SortableTableHead label="Événement" column="momentTitle" currentSort={sort} currentOrder={order} basePath={BASE} params={sortParams} />
              <SortableTableHead label="Communauté" column="circleName" currentSort={sort} currentOrder={order} basePath={BASE} params={sortParams} />
              <SortableTableHead label="Date inscription" column="registeredAt" currentSort={sort} currentOrder={order} basePath={BASE} params={sortParams} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {registrations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Aucune inscription sur cette période
                </TableCell>
              </TableRow>
            ) : (
              registrations.map((reg) => (
                <TableRow key={reg.id}>
                  <TableCell>
                    <Link
                      href={`/admin/users/${reg.userId}`}
                      className="font-medium hover:underline"
                    >
                      {reg.userName ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{reg.userEmail}</TableCell>
                  <TableCell>
                    <Link
                      href={`/m/${reg.momentSlug}`}
                      target="_blank"
                      className="flex items-center gap-1 hover:underline"
                    >
                      {reg.momentTitle}
                      <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{reg.circleName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {reg.registeredAt.toLocaleDateString("fr-FR")}
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
