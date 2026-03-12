import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { prismaAdminRepository } from "@/infrastructure/repositories";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 20;

const SEGMENTS = [
  { key: "never", label: "Jamais inscrits" },
  { key: "once", label: "1 événement" },
  { key: "retained", label: "Fidèles (2+)" },
] as const;

type Segment = (typeof SEGMENTS)[number]["key"];

type Props = {
  searchParams: Promise<{ segment?: string; page?: string }>;
};

export default async function AdminInsightActivationPage({ searchParams }: Props) {
  const params = await searchParams;
  const rawSegment = params.segment;
  const segment: Segment =
    rawSegment === "once" || rawSegment === "retained" ? rawSegment : "never";
  const page = Number(params.page ?? "1");
  const offset = (page - 1) * PAGE_SIZE;

  const [activation, { users, total }] = await Promise.all([
    prismaAdminRepository.getActivationStats(),
    prismaAdminRepository.getUsersByActivation(segment, PAGE_SIZE, offset),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Dashboard
        </Link>
        <h1 className="text-2xl font-bold">Analyse d'activation</h1>
      </div>

      {/* Stats globales */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-2xl font-bold tabular-nums">
              {activation.totalUsers.toLocaleString("fr-FR")}
            </p>
            <p className="text-sm text-muted-foreground">Utilisateurs réels</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-2xl font-bold tabular-nums">
              {activation.activatedUsers.toLocaleString("fr-FR")}
              <span className="ml-2 text-base font-normal text-muted-foreground">
                {activation.activationRate}%
              </span>
            </p>
            <p className="text-sm text-muted-foreground">Activés (≥ 1 inscription)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-2xl font-bold tabular-nums">
              {activation.retainedUsers.toLocaleString("fr-FR")}
              <span className="ml-2 text-base font-normal text-muted-foreground">
                {activation.retentionRate}%
              </span>
            </p>
            <p className="text-sm text-muted-foreground">Fidèles (≥ 2 événements)</p>
          </CardContent>
        </Card>
      </div>

      {/* Segment tabs */}
      <div className="flex items-center gap-1 rounded-lg border p-1 w-fit">
        {SEGMENTS.map(({ key, label }) => (
          <Link
            key={key}
            href={`/admin/insights/activation?segment=${key}`}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              segment === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Inscriptions</TableHead>
              <TableHead>Inscrit le</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Aucun utilisateur dans ce segment
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
                  <TableCell className="text-right tabular-nums">
                    {user.registrationCount}
                  </TableCell>
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
