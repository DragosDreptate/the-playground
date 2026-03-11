import { getTranslations } from "next-intl/server";
import { Users, CircleDot, CalendarDays, TicketCheck, MessageSquare, TrendingUp, Repeat2 } from "lucide-react";
import { prismaAdminRepository } from "@/infrastructure/repositories";
import { StatsCard } from "@/components/admin/stats-card";
import { ChartCard } from "@/components/admin/chart-card";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminDashboardPage() {
  const t = await getTranslations("Admin");

  const [stats, timeSeries, activation] = await Promise.all([
    prismaAdminRepository.getStats(),
    prismaAdminRepository.getTimeSeries(30),
    prismaAdminRepository.getActivationStats(),
  ]);

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold">{t("dashboard")}</h1>

      {/* KPIs globaux */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          label={t("stats.totalUsers")}
          value={stats.totalUsers}
          delta={stats.recentUsers}
          deltaLabel={t("stats.thisWeek")}
          icon={Users}
        />
        <StatsCard
          label={t("stats.totalCircles")}
          value={stats.totalCircles}
          delta={stats.recentCircles}
          deltaLabel={t("stats.thisWeek")}
          icon={CircleDot}
        />
        <StatsCard
          label={t("stats.totalMoments")}
          value={stats.totalMoments}
          delta={stats.recentMoments}
          deltaLabel={t("stats.thisWeek")}
          icon={CalendarDays}
        />
        <StatsCard
          label={t("stats.totalRegistrations")}
          value={stats.totalRegistrations}
          icon={TicketCheck}
        />
        <StatsCard
          label={t("stats.totalComments")}
          value={stats.totalComments}
          delta={stats.recentComments}
          deltaLabel={t("stats.thisWeek")}
          icon={MessageSquare}
        />
      </div>

      {/* Taux d'activation */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold">{t("activation.title")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Taux d'activation */}
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <TrendingUp className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold tabular-nums">{activation.activationRate}%</p>
                <p className="text-sm text-muted-foreground">{t("activation.activated")}</p>
                <p className="text-xs text-muted-foreground">
                  {activation.activatedUsers.toLocaleString("fr-FR")}{" "}
                  {t("activation.ofTotal", { total: activation.totalUsers.toLocaleString("fr-FR") })}
                  {" · "}{t("activation.activatedDesc")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Rétention */}
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Repeat2 className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold tabular-nums">{activation.retentionRate}%</p>
                <p className="text-sm text-muted-foreground">{t("activation.retained")}</p>
                <p className="text-xs text-muted-foreground">
                  {activation.retainedUsers.toLocaleString("fr-FR")}{" "}
                  {t("activation.ofTotal", { total: activation.totalUsers.toLocaleString("fr-FR") })}
                  {" · "}{t("activation.retainedDesc")}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Tendances 30 jours */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold">{t("timeSeries.title")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ChartCard
            title={t("timeSeries.users")}
            data={timeSeries.users}
            id="users"
            icon={Users}
          />
          <ChartCard
            title={t("timeSeries.registrations")}
            data={timeSeries.registrations}
            id="registrations"
            icon={TicketCheck}
          />
          <ChartCard
            title={t("timeSeries.moments")}
            data={timeSeries.moments}
            id="moments"
            icon={CalendarDays}
          />
        </div>
      </section>
    </div>
  );
}
