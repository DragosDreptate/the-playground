import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { prismaAdminRepository } from "@/infrastructure/repositories";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminCircleDeleteButton } from "./delete-button";
import { linkifyText } from "@/lib/linkify";
import { ExcludedToggle, OverrideScoreInput } from "@/components/admin/explorer-controls";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminCircleDetailPage({ params }: Props) {
  const { id } = await params;
  const t = await getTranslations("Admin");
  const tCat = await getTranslations("CircleCategory");
  const tStatus = await getTranslations("Moment.status");
  const circle = await prismaAdminRepository.findCircleById(id);

  if (!circle) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{t("circleDetail.title")}</p>
          <h1 className="text-2xl font-bold">{circle.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/circles/${circle.slug}`} target="_blank">
              <ExternalLink className="size-4" />
              {t("viewPublicPage")}
            </Link>
          </Button>
          <AdminCircleDeleteButton circleId={circle.id} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 p-5">
            <Row label="Slug" value={circle.slug} />
            <Row
              label={t("circleDetail.visibility")}
              value={<Badge variant="outline">{circle.visibility}</Badge>}
            />
            <Row
              label={t("circleDetail.category")}
              value={circle.category ? tCat(circle.category) : "—"}
            />
            <Row label={t("circleDetail.city")} value={circle.city ?? "—"} />
            <Row
              label={t("circleDetail.website")}
              value={
                circle.website ? (
                  <a
                    href={circle.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline underline-offset-2"
                  >
                    {circle.website.replace(/^https?:\/\//, "")}
                  </a>
                ) : (
                  "—"
                )
              }
            />
            <Row label={t("columns.createdAt")} value={circle.createdAt.toLocaleDateString()} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-5">
            <Row label={t("circleDetail.members")} value={String(circle.memberCount)} />
            <Row label={t("circleDetail.moments")} value={String(circle.momentCount)} />
            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-1">{t("circleDetail.host")}</p>
              {circle.hosts.map((host) => (
                <Link
                  key={host.id}
                  href={`/admin/users/${host.id}`}
                  className="text-sm font-medium hover:underline"
                >
                  {[host.firstName, host.lastName].filter(Boolean).join(" ") || host.email}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {circle.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("circleDetail.description")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{linkifyText(circle.description)}</p>
          </CardContent>
        </Card>
      )}

      {/* Explorer Visibility */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("circleDetail.explorerVisibility")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row
            label={t("explorer.columns.score")}
            value={
              <span className="tabular-nums font-mono">
                {circle.overrideScore !== null ? (
                  <span className="text-amber-600 font-semibold">{circle.overrideScore}</span>
                ) : (
                  circle.explorerScore
                )}
                {circle.scoreUpdatedAt && (
                  <span className="ml-2 text-xs text-muted-foreground font-sans">
                    {t("explorer.lastUpdated", {
                      date: circle.scoreUpdatedAt.toLocaleDateString(),
                    })}
                  </span>
                )}
              </span>
            }
          />
          {circle.isDemo && (
            <Row
              label={t("explorer.columns.demo")}
              value={<Badge variant="secondary" className="text-xs">{t("explorer.columns.demo")}</Badge>}
            />
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("explorer.columns.override")}</span>
            <OverrideScoreInput circleId={circle.id} overrideScore={circle.overrideScore} />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("explorer.columns.visible")}</span>
            <ExcludedToggle circleId={circle.id} excluded={circle.excludedFromExplorer} />
          </div>
        </CardContent>
      </Card>

      {/* Recent Moments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("circleDetail.recentMoments")}</CardTitle>
        </CardHeader>
        <CardContent>
          {circle.recentMoments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("circleDetail.noMoments")}</p>
          ) : (
            <div className="space-y-2">
              {circle.recentMoments.map((moment) => (
                <div key={moment.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <Link
                    href={`/admin/moments/${moment.id}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {moment.title}
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {moment.startsAt.toLocaleDateString()}
                    </span>
                    <Badge variant={moment.status === "CANCELLED" ? "outline" : "secondary"} className="text-xs">
                      {tStatus(moment.status.toLowerCase() as "published" | "cancelled" | "past")}
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
