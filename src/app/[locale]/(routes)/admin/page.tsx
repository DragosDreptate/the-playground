import { getTranslations } from "next-intl/server";
import { Users, CircleDot, CalendarDays, TicketCheck, MessageSquare } from "lucide-react";
import { prismaAdminRepository } from "@/infrastructure/repositories";
import { StatsCard } from "@/components/admin/stats-card";

export default async function AdminDashboardPage() {
  const t = await getTranslations("Admin");
  const stats = await prismaAdminRepository.getStats();

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{t("dashboard")}</h1>

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
    </div>
  );
}
