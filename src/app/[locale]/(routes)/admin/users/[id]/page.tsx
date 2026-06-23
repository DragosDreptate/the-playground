import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { prismaAdminRepository } from "@/infrastructure/repositories";
import { buildBlockTargets } from "@/infrastructure/services/audit/block-targets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { formatLongDate } from "@/lib/format-date";
import { buildSentryIssuesSearchUrl } from "@/lib/sentry-url";
import { buildPostHogPersonUrl } from "@/lib/posthog-url";
import type { CircleMemberRole } from "@/domain/models/circle";
import { AdminUserDeleteButton } from "./delete-button";
import { AdminUserAuditPanel } from "./audit-panel";

const ROLE_I18N_KEY: Record<CircleMemberRole, "host" | "coHost" | "player"> = {
  HOST: "host",
  CO_HOST: "coHost",
  PLAYER: "player",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminUserDetailPage({ params }: Props) {
  const { id } = await params;
  const t = await getTranslations("Admin");
  const tRole = await getTranslations("Dashboard.role");
  const locale = await getLocale();
  const user = await prismaAdminRepository.findUserById(id);

  if (!user) notFound();

  // Cibles de blocage calculées au rendu pour afficher les boutons en
  // permanence (pas seulement après un audit).
  const blockTargets = await buildBlockTargets(user.id);

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "—";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("userDetail.auth.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-5 pt-0">
          <Row
            label={t("userDetail.auth.providers")}
            value={
              user.auth.providers.length === 0 ? (
                <Badge variant="outline">{t("userDetail.auth.magicLinkOnly")}</Badge>
              ) : (
                <div className="flex flex-wrap gap-1 justify-end">
                  {user.auth.providers.map((p) => (
                    <Badge key={p} variant="secondary" className="capitalize">
                      {p}
                    </Badge>
                  ))}
                </div>
              )
            }
          />
          <Row
            label={t("userDetail.auth.emailVerified")}
            value={formatDateOrNever(user.auth.emailVerified, locale, t("userDetail.auth.never"))}
          />
          <Row
            label={t("userDetail.auth.activeSessions")}
            value={
              user.auth.activeSessionsCount === 0 || !user.auth.latestSessionExpires
                ? t("userDetail.auth.never")
                : t("userDetail.auth.sessionsExpiring", {
                    count: user.auth.activeSessionsCount,
                    date: formatLongDate(user.auth.latestSessionExpires, locale),
                  })
            }
          />
          <Row
            label={t("userDetail.auth.pendingMagicLinks")}
            value={
              user.auth.pendingMagicLinksCount === 0 || !user.auth.latestPendingMagicLinkExpires
                ? t("userDetail.auth.none")
                : t("userDetail.auth.tokensExpiring", {
                    count: user.auth.pendingMagicLinksCount,
                    date: formatLongDate(user.auth.latestPendingMagicLinkExpires, locale),
                  })
            }
          />
          <Row
            label={t("userDetail.auth.welcomeEmail")}
            value={formatDateOrNever(user.auth.welcomeEmailSentAt, locale, t("userDetail.auth.never"))}
          />
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t">
            <CopyButton
              value={user.id}
              label={t("userDetail.actions.copyId")}
              copiedLabel={t("userDetail.actions.idCopied")}
            />
            <Button variant="ghost" size="sm" asChild>
              <a
                href={buildSentryIssuesSearchUrl(`user.email:${user.email}`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="size-4" />
                {t("userDetail.actions.viewInSentry")}
              </a>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a
                href={buildPostHogPersonUrl(user.id)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="size-4" />
                {t("userDetail.actions.viewInPostHog")}
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <AdminUserAuditPanel
        userId={user.id}
        email={user.email}
        initialTargets={blockTargets}
      />

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
                    className="text-sm font-medium hover:text-primary dark:hover:text-[oklch(0.76_0.27_341)] transition-colors"
                  >
                    {circle.name}
                  </Link>
                  <Badge variant="outline" className="text-xs">
                    {tRole(circle.status === "PENDING" ? "pending" : ROLE_I18N_KEY[circle.role])}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("userDetail.moments")}</CardTitle>
        </CardHeader>
        <CardContent>
          {user.moments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("userDetail.noMoments")}</p>
          ) : (
            <div className="space-y-2">
              {user.moments.map((moment) => (
                <div key={moment.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/m/${moment.slug}`}
                      className="text-sm font-medium hover:text-primary dark:hover:text-[oklch(0.76_0.27_341)] transition-colors"
                    >
                      {moment.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {moment.circleName} — {moment.startsAt.toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={statusVariant(moment.status)} className="ml-2 text-xs">
                    {moment.status}
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

function formatDateOrNever(date: Date | null, locale: string, neverLabel: string): string {
  return date ? formatLongDate(date, locale) : neverLabel;
}

function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "PUBLISHED": return "default";
    case "DRAFT": return "secondary";
    case "CANCELLED": return "destructive";
    case "PAST": return "outline";
    default: return "outline";
  }
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
