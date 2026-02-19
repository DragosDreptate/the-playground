import { auth } from "@/infrastructure/auth/auth.config";
import { prismaCircleRepository } from "@/infrastructure/repositories";
import { getUserCircles } from "@/domain/usecases/get-user-circles";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { CircleCard } from "@/components/circles/circle-card";

export default async function DashboardPage() {
  const session = await auth();
  const t = await getTranslations("Dashboard");

  const circles = await getUserCircles(session!.user!.id!, {
    circleRepository: prismaCircleRepository,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("myCircles")}</h1>
        <Button asChild>
          <Link href="/dashboard/circles/new">{t("createCircle")}</Link>
        </Button>
      </div>

      {circles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <h2 className="text-lg font-medium">{t("empty.title")}</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("empty.description")}
          </p>
          <Button asChild className="mt-6">
            <Link href="/dashboard/circles/new">{t("createCircle")}</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {circles.map((circle) => (
            <CircleCard key={circle.id} circle={circle} />
          ))}
        </div>
      )}
    </div>
  );
}
