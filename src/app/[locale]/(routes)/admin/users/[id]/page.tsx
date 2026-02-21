import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { prismaAdminRepository } from "@/infrastructure/repositories";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminUserDeleteButton } from "./delete-button";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminUserDetailPage({ params }: Props) {
  const { id } = await params;
  const t = await getTranslations("Admin");
  const user = await prismaAdminRepository.findUserById(id);

  if (!user) notFound();

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{t("userDetail.title")}</p>
          <h1 className="text-2xl font-bold">{displayName}</h1>
        </div>
        <AdminUserDeleteButton userId={user.id} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 p-5">
            <Row label={t("columns.email")} value={user.email} />
            <Row
              label={t("userDetail.role")}
              value={
                user.role === "ADMIN" ? (
                  <Badge variant="default">Admin</Badge>
                ) : (
                  <Badge variant="secondary">User</Badge>
                )
              }
            />
            <Row
              label={t("userDetail.onboarding")}
              value={user.onboardingCompleted ? t("userDetail.completed") : t("userDetail.pending")}
            />
            <Row
              label={t("userDetail.memberSince")}
              value={user.createdAt.toLocaleDateString()}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-5">
            <Row label={t("columns.circles")} value={String(user.circleCount)} />
            <Row label={t("columns.moments")} value={String(user.registrationCount)} />
          </CardContent>
        </Card>
      </div>

      {/* Circles list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("userDetail.circles")}</CardTitle>
        </CardHeader>
        <CardContent>
          {user.circles.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("userDetail.noCircles")}</p>
          ) : (
            <div className="space-y-2">
              {user.circles.map((circle) => (
                <div key={circle.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <Link
                    href={`/admin/circles/${circle.id}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {circle.name}
                  </Link>
                  <Badge variant="outline" className="text-xs">
                    {circle.role}
                  </Badge>
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
