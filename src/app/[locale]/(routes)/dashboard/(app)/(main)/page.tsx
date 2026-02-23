import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth.config";
import {
  prismaCircleRepository,
  prismaMomentRepository,
  prismaRegistrationRepository,
} from "@/infrastructure/repositories";
import { getUserCirclesWithRole } from "@/domain/usecases/get-user-circles-with-role";
import { getUserUpcomingMoments } from "@/domain/usecases/get-user-upcoming-moments";
import { getUserPastMoments } from "@/domain/usecases/get-user-past-moments";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { CircleCard } from "@/components/circles/circle-card";
import { DashboardMomentCard } from "@/components/moments/dashboard-moment-card";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = tab === "circles" ? "circles" : "moments";

  const session = await auth();
  const t = await getTranslations("Dashboard");

  if (!session?.user?.id) {
    return null;
  }

  const userId = session.user.id;

  // Transition PUBLISHED → PAST for ended Moments
  await prismaMomentRepository.transitionPastMoments();

  const [upcomingMoments, pastMoments, circles] = await Promise.all([
    getUserUpcomingMoments(userId, {
      registrationRepository: prismaRegistrationRepository,
    }),
    getUserPastMoments(userId, {
      registrationRepository: prismaRegistrationRepository,
    }),
    getUserCirclesWithRole(userId, {
      circleRepository: prismaCircleRepository,
    }),
  ]);

  // Récupère les compteurs de membres en une seule requête GROUP BY (évite le N+1)
  const memberCountById = await prismaCircleRepository.findMemberCountsByCircleIds(
    circles.map((c) => c.id)
  );

  // Redirect vers la page de bienvenue si l'utilisateur n'a aucune activité
  const hasActivity =
    circles.length > 0 || upcomingMoments.length > 0 || pastMoments.length > 0;
  if (!hasActivity) {
    redirect("/dashboard/welcome");
  }

  // Set des slugs de Cercles dont l'utilisateur est Host (pour les cartes de Moments)
  const hostCircleSlugs = new Set(
    circles.filter((c) => c.memberRole === "HOST").map((c) => c.slug)
  );

  // Extract first name for greeting
  const firstName = session.user.name?.split(" ")[0];

  const hasMoments = upcomingMoments.length > 0 || pastMoments.length > 0;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Greeting */}
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">
          {firstName
            ? t("greeting", { name: firstName })
            : t("greetingAnonymous")}
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed">{t("greetingSubtitle")}</p>
      </div>

      {/* Tab selector + action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-full border p-1">
          <Link
            href="?tab=moments"
            className={`rounded-full px-4 py-1 text-sm font-medium transition-colors ${
              activeTab === "moments"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("myMoments")}
          </Link>
          <Link
            href="?tab=circles"
            className={`rounded-full px-4 py-1 text-sm font-medium transition-colors ${
              activeTab === "circles"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("myCircles")}
          </Link>
        </div>
        {activeTab === "circles" && (
          <Button asChild size="sm">
            <Link href="/dashboard/circles/new">{t("createCircle")}</Link>
          </Button>
        )}
      </div>

      {/* Tab content */}
      {activeTab === "moments" ? (
        <section>
          {!hasMoments ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
              <p className="text-muted-foreground text-sm">
                {t("noMoments")}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {t("noMomentsHint")}
              </p>
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
      ) : (
        <section>
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
        </section>
      )}
    </div>
  );
}
