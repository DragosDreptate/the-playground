import { getTranslations } from "next-intl/server";
import Link from "next/link";
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

type Props = {
  searchParams: Promise<{ search?: string; page?: string }>;
};

export default async function AdminMomentsPage({ searchParams }: Props) {
  const params = await searchParams;
  const t = await getTranslations("Admin");
  const tStatus = await getTranslations("Moment.status");
  const search = params.search ?? undefined;
  const page = Number(params.page ?? "1");
  const offset = (page - 1) * PAGE_SIZE;

  const [moments, total] = await Promise.all([
    prismaAdminRepository.findAllMoments({ search, limit: PAGE_SIZE, offset }),
    prismaAdminRepository.countMoments({ search }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("moments")}</h1>

      <AdminSearch />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.title")}</TableHead>
              <TableHead>{t("columns.circle")}</TableHead>
              <TableHead>{t("columns.date")}</TableHead>
              <TableHead>{t("columns.status")}</TableHead>
              <TableHead className="text-right">{t("columns.registrations")}</TableHead>
              <TableHead>{t("columns.createdAt")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {moments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  {t("table.noResults")}
                </TableCell>
              </TableRow>
            ) : (
              moments.map((moment) => (
                <TableRow key={moment.id}>
                  <TableCell>
                    <Link
                      href={`/admin/moments/${moment.id}`}
                      className="font-medium hover:underline"
                    >
                      {moment.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{moment.circleName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {moment.startsAt.toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(moment.status)}>
                      {tStatus(moment.status.toLowerCase() as "published" | "cancelled" | "past")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {moment.registrationCount}
                    {moment.capacity ? `/${moment.capacity}` : ""}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {moment.createdAt.toLocaleDateString()}
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
