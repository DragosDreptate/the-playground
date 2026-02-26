import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { prismaAdminRepository } from "@/infrastructure/repositories";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminMomentActions } from "./actions";

type Props = {
  params: Promise<{ id: string }>;
};

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

export default async function AdminMomentDetailPage({ params }: Props) {
  const { id } = await params;
  const t = await getTranslations("Admin");
  const tStatus = await getTranslations("Moment.status");
  const moment = await prismaAdminRepository.findMomentById(id);

  if (!moment) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{t("momentDetail.title")}</p>
          <h1 className="text-2xl font-bold">{moment.title}</h1>
        </div>
        <AdminMomentActions momentId={moment.id} status={moment.status} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 p-5">
            <Row label="Slug" value={moment.slug} />
            <Row
              label={t("momentDetail.circle")}
              value={
                <Link href={`/admin/circles/${moment.circleId}`} className="hover:underline">
                  {moment.circleName}
                </Link>
              }
            />
            <Row
              label={t("momentDetail.createdBy")}
              value={moment.createdByName || moment.createdByEmail || "—"}
            />
            <Row
              label={t("momentDetail.status")}
              value={
                <Badge variant={statusVariant(moment.status)}>
                  {tStatus(moment.status.toLowerCase() as "published" | "cancelled" | "past")}
                </Badge>
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-5">
            <Row
              label={t("momentDetail.date")}
              value={moment.startsAt.toLocaleString()}
            />
            <Row
              label={t("momentDetail.capacity")}
              value={moment.capacity ? String(moment.capacity) : t("momentDetail.unlimited")}
            />
            <Row
              label={t("momentDetail.registrations")}
              value={String(moment.registrationCount)}
            />
            <Row
              label={t("momentDetail.comments")}
              value={String(moment.commentCount)}
            />
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {moment.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{moment.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Registrations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("momentDetail.registrations")}</CardTitle>
        </CardHeader>
        <CardContent>
          {moment.registrations.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("momentDetail.noRegistrations")}</p>
          ) : (
            <div className="space-y-2">
              {moment.registrations.map((reg) => (
                <div key={reg.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                    <Link
                      href={`/admin/users/${reg.userId}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {reg.userName || reg.userEmail}
                    </Link>
                    {reg.userName && (
                      <span className="ml-2 text-xs text-muted-foreground">{reg.userEmail}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {reg.registeredAt.toLocaleDateString()}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {reg.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
