import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 20;
const BASE = "/admin/insights/moments";

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

function statusLabel(status: string) {
  switch (status) {
    case "PUBLISHED": return "Publié";
    case "CANCELLED": return "Annulé";
    case "PAST": return "Passé";
    default: return status;
  }
}

type Props = {
  searchParams: Promise<{ days?: string; page?: string; sort?: string; order?: string }>;
};

export default async function AdminInsightMomentsPage({ searchParams }: Props) {
  const params = await searchParams;
  const days = Number(params.days ?? "30");
  const page = Number(params.page ?? "1");
  const sort = params.sort;
  const order = params.order === "asc" ? "asc" : "desc";
  const offset = (page - 1) * PAGE_SIZE;

  const sortParams: Record<string, string> = { days: String(days) };
  const SH = ({ label, column, className }: { label: string; column: string; className?: string }) => (
    <SortableTableHead label={label} column={column} currentSort={sort} currentOrder={order} basePath={BASE} params={sortParams} className={className} />
  );

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [timeSeries, moments, total] = await Promise.all([
    prismaAdminRepository.getTimeSeries(days),
    prismaAdminRepository.findAllMoments({ limit: PAGE_SIZE, offset, since, sortBy: sort, sortOrder: order }),
    prismaAdminRepository.countMoments({ since }),
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
          <h1 className="text-2xl font-bold">Événements créés</h1>
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
          <SparklineChart data={timeSeries.moments} id="insight-moments" height={120} />
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SH label="Titre" column="title" />
              <SH label="Communauté" column="circleName" />
              <SH label="Statut" column="status" className="w-px" />
              <SH label="Inscrits" column="registrationCount" className="w-px text-right" />
              <SH label="Créé le" column="createdAt" className="w-px" />
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {moments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Aucun événement
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
                  <TableCell>
                    <Badge variant={statusVariant(moment.status)}>
                      {statusLabel(moment.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {moment.registrationCount}
                    {moment.capacity ? `/${moment.capacity}` : ""}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {moment.createdAt.toLocaleDateString("fr-FR")}
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
