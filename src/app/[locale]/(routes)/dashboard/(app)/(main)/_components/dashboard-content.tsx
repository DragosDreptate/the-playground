import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  prismaCircleRepository,
  prismaMomentRepository,
  prismaRegistrationRepository,
} from "@/infrastructure/repositories";
import { getUserDashboardCircles } from "@/domain/usecases/get-user-dashboard-circles";
import { getUserUpcomingMoments } from "@/domain/usecases/get-user-upcoming-moments";
import { getUserPastMoments } from "@/domain/usecases/get-user-past-moments";
import { DashboardCircleCard } from "@/components/circles/dashboard-circle-card";
import { DashboardMomentCard } from "@/components/moments/dashboard-moment-card";

export async function DashboardContent({
  userId,
  activeTab,
}: {
  userId: string;
  activeTab: "moments" | "circles";
}) {
  // Transition PUBLISHED → PAST pour les Moments terminés
  await prismaMomentRepository.transitionPastMoments();

  const [upcomingMoments, pastMoments, circles] = await Promise.all([
    getUserUpcomingMoments(userId, {
      registrationRepository: prismaRegistrationRepository,
    }),
    getUserPastMoments(userId, {
      registrationRepository: prismaRegistrationRepository,
    }),
    getUserDashboardCircles(userId, {
      circleRepository: prismaCircleRepository,
    }),
  ]);

  const hasActivity =
    circles.length > 0 || upcomingMoments.length > 0 || pastMoments.length > 0;
  if (!hasActivity) {
    redirect("/dashboard/welcome");
  }

  const t = await getTranslations("Dashboard");

  const hostCircleSlugs = new Set(
    circles.filter((c) => c.memberRole === "HOST").map((c) => c.slug)
  );
  const hasMoments = upcomingMoments.length > 0 || pastMoments.length > 0;

  if (activeTab === "moments") {
    return (
      <section>
        {!hasMoments ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
            <p className="text-muted-foreground text-sm">{t("noMoments")}</p>
            <p className="text-muted-foreground mt-1 text-xs">{t("noMomentsHint")}</p>
          </div>
        ) : (
          <div>
            {/* Upcoming moments */}
            {upcomingMoments.map((reg, i) => (
              <DashboardMomentCard
                key={reg.id}
                registration={reg}
                isLast={i === upcomingMoments.length - 1 && pastMoments.length === 0}
                isHost={hostCircleSlugs.has(reg.moment.circleSlug)}
              />
            ))}

            {/* Separator between upcoming and past */}
            {upcomingMoments.length > 0 && pastMoments.length > 0 && (
              <div className="flex items-center gap-0 pb-8">
                <div className="w-[100px] shrink-0 pr-4" />
                <div className="flex shrink-0 flex-col items-center">
                  <div className="size-2 shrink-0" />
                </div>
                <div className="min-w-0 flex-1 pl-4">
                  <div className="border-border flex items-center gap-3 border-t pt-0">
                    <span className="text-muted-foreground/60 -mt-3 bg-background pr-3 text-xs font-medium">
                      {t("pastMoments")}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Past moments (no upcoming) — section label */}
            {upcomingMoments.length === 0 && pastMoments.length > 0 && (
              <p className="text-muted-foreground mb-4 text-xs font-semibold uppercase tracking-wider">
                {t("pastMoments")}
              </p>
            )}

            {/* Past moments */}
            {pastMoments.map((reg, i) => (
              <DashboardMomentCard
                key={reg.id}
                registration={reg}
                isLast={i === pastMoments.length - 1}
                isHost={hostCircleSlugs.has(reg.moment.circleSlug)}
                isPast
              />
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <section>
      {circles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <p className="text-muted-foreground text-sm">{t("emptyCircles")}</p>
          <p className="text-muted-foreground mt-1 text-xs">{t("emptyCirclesHint")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {circles.map((circle) => (
            <DashboardCircleCard key={circle.id} circle={circle} />
          ))}
        </div>
      )}
    </section>
  );
}
