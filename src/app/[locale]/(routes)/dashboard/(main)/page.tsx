import { auth } from "@/infrastructure/auth/auth.config";
import {
  prismaCircleRepository,
  prismaRegistrationRepository,
} from "@/infrastructure/repositories";
import { getUserCirclesWithRole } from "@/domain/usecases/get-user-circles-with-role";
import { getUserUpcomingMoments } from "@/domain/usecases/get-user-upcoming-moments";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { CircleCard } from "@/components/circles/circle-card";
import { UpcomingMomentCard } from "@/components/moments/upcoming-moment-card";

export default async function DashboardPage() {
  const session = await auth();
  const t = await getTranslations("Dashboard");

  if (!session?.user?.id) {
    return null;
  }

  const userId = session.user.id;

  const [upcomingMoments, circles] = await Promise.all([
    getUserUpcomingMoments(userId, {
      registrationRepository: prismaRegistrationRepository,
    }),
    getUserCirclesWithRole(userId, {
      circleRepository: prismaCircleRepository,
    }),
  ]);

  const isHost = circles.some((c) => c.memberRole === "HOST");

  return (
    <div className="space-y-10">
      {/* Section 1: Upcoming Moments */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">
          {t("upcomingMoments")}
        </h2>
        {upcomingMoments.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t("noUpcomingMoments")}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {upcomingMoments.map((reg) => (
              <UpcomingMomentCard key={reg.id} registration={reg} />
            ))}
          </div>
        )}
      </section>

      {/* Section 2: My Circles */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">
            {t("myCircles")}
          </h2>
          {isHost && (
            <div className="flex gap-2">
              <Button size="sm" asChild>
                <Link href="/dashboard/moments/new">{t("createMoment")}</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/circles/new">{t("createCircle")}</Link>
              </Button>
            </div>
          )}
        </div>
        {circles.length === 0 ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-muted-foreground text-sm">{t("noCirclesMember")}</p>
            <Button asChild>
              <Link href="/dashboard/circles/new">{t("createCircle")}</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {circles.map((circle) => (
              <CircleCard
                key={circle.id}
                circle={circle}
                role={circle.memberRole}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
