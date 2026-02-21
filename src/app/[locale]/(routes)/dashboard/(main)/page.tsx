import { auth } from "@/infrastructure/auth/auth.config";
import {
  prismaCircleRepository,
  prismaMomentRepository,
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

  // Transition PUBLISHED → PAST for ended Moments
  await prismaMomentRepository.transitionPastMoments();

  const [upcomingMoments, circles] = await Promise.all([
    getUserUpcomingMoments(userId, {
      registrationRepository: prismaRegistrationRepository,
    }),
    getUserCirclesWithRole(userId, {
      circleRepository: prismaCircleRepository,
    }),
  ]);

  // Fetch member counts for all circles
  const memberCounts = await Promise.all(
    circles.map((c) => prismaCircleRepository.countMembers(c.id))
  );
  const memberCountById = new Map(
    circles.map((c, i) => [c.id, memberCounts[i]])
  );

  const isHost = circles.some((c) => c.memberRole === "HOST");

  // Extract first name for greeting
  const firstName = session.user.name?.split(" ")[0];

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      {/* Greeting */}
      <h1 className="text-3xl font-bold tracking-tight">
        {firstName
          ? t("greeting", { name: firstName })
          : t("greetingAnonymous")}
      </h1>

      {/* Section 1: Upcoming Moments — Timeline */}
      <section className="space-y-4">
        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
          {t("upcomingMoments")}
        </p>
        {upcomingMoments.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t("noUpcomingMoments")}
          </p>
        ) : (
          <div>
            {upcomingMoments.map((reg, i) => (
              <UpcomingMomentCard
                key={reg.id}
                registration={reg}
                isLast={i === upcomingMoments.length - 1}
              />
            ))}
          </div>
        )}
      </section>

      {/* Separator */}
      <div className="border-border border-t" />

      {/* Section 2: My Circles */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            {t("myCircles")}
          </p>
          {isHost && (
            <div className="flex flex-wrap gap-2">
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
          <div className="flex flex-col gap-4">
            {circles.map((circle) => (
              <CircleCard
                key={circle.id}
                circle={circle}
                role={circle.memberRole}
                memberCount={memberCountById.get(circle.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
