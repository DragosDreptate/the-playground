import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { prismaCommentRepository } from "@/infrastructure/repositories";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminCommentRowActions } from "@/components/admin/admin-comment-row-actions";
import { getPublicDisplayName } from "@/lib/display-name";
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
const BASE = "/admin/comments";

type Props = {
  searchParams: Promise<{ page?: string; status?: string }>;
};

export default async function AdminCommentsPage({ searchParams }: Props) {
  const params = await searchParams;
  const t = await getTranslations("Admin.commentModeration");

  const page = Number(params.page ?? "1");
  const offset = (page - 1) * PAGE_SIZE;
  const statusFilter: CommentStatus | undefined =
    params.status === "pending" ? "PENDING_REVIEW" : undefined;

  const { items, total } = await prismaCommentRepository.findForAdmin({
    status: statusFilter,
    skip: offset,
    take: PAGE_SIZE,
  });

  const filters: { key: string; href: string; active: boolean }[] = [
    { key: "filterAll", href: BASE, active: !statusFilter },
    {
      key: "filterPending",
      href: `${BASE}?status=pending`,
      active: statusFilter === "PENDING_REVIEW",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <div className="flex gap-2">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={f.href}
            className={`rounded-full px-3 py-1 text-sm ${
              f.active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {t(f.key)}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground py-8 text-sm">{t("empty")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("colAuthor")}</TableHead>
              <TableHead>{t("colComment")}</TableHead>
              <TableHead>{t("colEvent")}</TableHead>
              <TableHead>{t("colStatus")}</TableHead>
              <TableHead>{t("colDate")}</TableHead>
              <TableHead className="text-right">{t("colActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((c) => {
              const isPending = c.status === "PENDING_REVIEW";
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    {getPublicDisplayName(
                      c.user.firstName,
                      c.user.lastName,
                      c.user.email
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <span className="line-clamp-2 text-sm">{c.content}</span>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/m/${c.moment.slug}`}
                      className="text-sm hover:underline"
                      target="_blank"
                    >
                      {c.moment.title}
                    </Link>
                    <span className="text-muted-foreground block text-xs">
                      {c.circle.name}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={isPending ? "secondary" : "outline"}>
                      {isPending ? t("statusPending") : t("statusPublished")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {c.createdAt.toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>
                    <AdminCommentRowActions
                      commentId={c.id}
                      isPending={isPending}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <AdminPagination total={total} />
    </div>
  );
}
