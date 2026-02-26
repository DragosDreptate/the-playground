import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { prismaAdminRepository } from "@/infrastructure/repositories";
import { AdminSearch } from "@/components/admin/admin-search";
import { AdminPagination } from "@/components/admin/admin-pagination";
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

type Props = {
  searchParams: Promise<{ search?: string; page?: string }>;
};

export default async function AdminCirclesPage({ searchParams }: Props) {
  const params = await searchParams;
  const t = await getTranslations("Admin");
  const tCat = await getTranslations("CircleCategory");
  const search = params.search ?? undefined;
  const page = Number(params.page ?? "1");
  const offset = (page - 1) * PAGE_SIZE;

  const [circles, total] = await Promise.all([
    prismaAdminRepository.findAllCircles({ search, limit: PAGE_SIZE, offset }),
    prismaAdminRepository.countCircles({ search }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("circles")}</h1>

      <AdminSearch />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.name")}</TableHead>
              <TableHead>{t("columns.host")}</TableHead>
              <TableHead className="text-right">{t("columns.members")}</TableHead>
              <TableHead className="text-right">{t("columns.moments")}</TableHead>
              <TableHead>{t("columns.visibility")}</TableHead>
              <TableHead>{t("columns.category")}</TableHead>
              <TableHead>{t("columns.createdAt")}</TableHead>
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
