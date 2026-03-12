import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { prismaAdminRepository } from "@/infrastructure/repositories";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { PeriodSelector } from "@/components/admin/period-selector";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 20;

type Props = {
  searchParams: Promise<{ days?: string; page?: string }>;
};

export default async function AdminInsightCommentsPage({ searchParams }: Props) {
  const params = await searchParams;
  const days = Number(params.days ?? "30");
  const page = Number(params.page ?? "1");
  const offset = (page - 1) * PAGE_SIZE;

  const { comments, total } = await prismaAdminRepository.getCommentsInsight(
    days,
    PAGE_SIZE,
    offset
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
          <h1 className="text-2xl font-bold">Commentaires</h1>
        </div>
        <PeriodSelector currentDays={days} basePath="/admin/insights/comments" />
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Auteur</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Contenu</TableHead>
              <TableHead>Événement</TableHead>
              <TableHead>Communauté</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Aucun commentaire sur cette période
                </TableCell>
              </TableRow>
            ) : (
              comments.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link
                      href={`/admin/users/${c.userId}`}
                      className="font-medium hover:underline"
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
                      className="flex items-center gap-1 hover:underline"
                    >
                      {c.momentTitle}
                      <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.circleName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.createdAt.toLocaleDateString("fr-FR")}
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
