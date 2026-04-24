import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { prismaAdminRepository } from "@/infrastructure/repositories";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { PeriodSelector } from "@/components/admin/period-selector";
import { SortableTableHead } from "@/components/admin/sortable-table-head";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 20;
const BASE = "/admin/insights/members";

type Props = {
  searchParams: Promise<{ days?: string; page?: string; sort?: string; order?: string }>;
};

export default async function AdminInsightMembersPage({ searchParams }: Props) {
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

  const { members, total } = await prismaAdminRepository.getMembersInsight(
    days,
    PAGE_SIZE,
    offset,
    sort,
    order
  );

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
          <h1 className="text-2xl font-bold">Membres</h1>
        </div>
        <PeriodSelector currentDays={days} basePath={BASE} />
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SH label="Participant" column="userName" />
              <SH label="Email" column="userEmail" />
              <SH label="Communauté" column="circleName" />
              <SH label="Date d'adhésion" column="joinedAt" className="w-px" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Aucun membre sur cette période
                </TableCell>
              </TableRow>
            ) : (
              members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <Link
                      href={`/admin/users/${m.userId}`}
                      className="font-medium hover:text-primary dark:hover:text-[oklch(0.76_0.27_341)] transition-colors"
                    >
                      {m.userName ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{m.userEmail}</TableCell>
                  <TableCell>
                    <Link
                      href={`/circles/${m.circleSlug}`}
                      target="_blank"
                      className="flex items-center gap-1 hover:text-primary dark:hover:text-[oklch(0.76_0.27_341)] transition-colors"
                    >
                      {m.circleName}
                      <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.joinedAt.toLocaleDateString("fr-FR")}
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
