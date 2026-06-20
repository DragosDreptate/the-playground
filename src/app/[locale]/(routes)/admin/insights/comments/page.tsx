import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { prismaAdminRepository } from "@/infrastructure/repositories";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { PeriodSelector } from "@/components/admin/period-selector";
import { SortableTableHead } from "@/components/admin/sortable-table-head";
import { AdminCommentRowActions } from "@/components/admin/admin-comment-row-actions";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CommentStatus } from "@/domain/models/comment";

const PAGE_SIZE = 20;
const BASE = "/admin/insights/comments";

type Props = {
  searchParams: Promise<{ days?: string; page?: string; sort?: string; order?: string; status?: string }>;
};

export default async function AdminInsightCommentsPage({ searchParams }: Props) {
  const params = await searchParams;
  const days = Number(params.days ?? "30");
  const page = Number(params.page ?? "1");
  const sort = params.sort;
  const order = params.order === "asc" ? "asc" : "desc";
  const offset = (page - 1) * PAGE_SIZE;
  const statusFilter: CommentStatus | undefined =
    params.status === "pending" ? "PENDING_REVIEW" : undefined;

  const sortParams: Record<string, string> = {
    days: String(days),
    ...(statusFilter ? { status: "pending" } : {}),
  };
  const SH = ({ label, column, className }: { label: string; column: string; className?: string }) => (
    <SortableTableHead label={label} column={column} currentSort={sort} currentOrder={order} basePath={BASE} params={sortParams} className={className} />
  );

  const { comments, total } = await prismaAdminRepository.getCommentsInsight(
    days,
    PAGE_SIZE,
    offset,
    sort,
    order,
    statusFilter
  );

  const statusFilters: { label: string; href: string; active: boolean }[] = [
    { label: "Tous", href: BASE, active: !statusFilter },
    { label: "En attente", href: `${BASE}?status=pending`, active: !!statusFilter },
  ];

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
          <h1 className="text-2xl font-bold">Commentaires</h1>
        </div>
        <PeriodSelector currentDays={days} basePath={BASE} />
      </div>

      <div className="flex gap-2">
        {statusFilters.map((f) => (
          <Link
            key={f.label}
            href={f.href}
            className={`rounded-full px-3 py-1 text-sm ${
              f.active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SH label="Auteur" column="userName" />
              <SH label="Email" column="userEmail" />
              <TableHead>Contenu</TableHead>
              <SH label="Événement" column="momentTitle" />
              <SH label="Communauté" column="circleName" className="w-px" />
              <TableHead className="w-px">Statut</TableHead>
              <SH label="Date" column="createdAt" className="w-px" />
              <TableHead className="w-px text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  {statusFilter
                    ? "Aucun commentaire en attente"
                    : "Aucun commentaire sur cette période"}
                </TableCell>
              </TableRow>
            ) : (
              comments.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link
                      href={`/admin/users/${c.userId}`}
                      className="font-medium hover:text-primary dark:hover:text-[oklch(0.76_0.27_341)] transition-colors"
                    >
                      {c.userName ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.userEmail}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {c.content}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/m/${c.momentSlug}`}
                      target="_blank"
                      className="flex items-center gap-1 hover:text-primary dark:hover:text-[oklch(0.76_0.27_341)] transition-colors"
                    >
                      {c.momentTitle}
                      <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.circleName}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === "PENDING_REVIEW" ? "secondary" : "outline"}>
                      {c.status === "PENDING_REVIEW" ? "En attente" : "Publié"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.createdAt.toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell>
                    <AdminCommentRowActions
                      commentId={c.id}
                      isPending={c.status === "PENDING_REVIEW"}
                    />
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
