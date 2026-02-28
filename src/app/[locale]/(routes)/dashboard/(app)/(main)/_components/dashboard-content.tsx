import { getTranslations } from "next-intl/server";
import {
  prismaCircleRepository,
  prismaMomentRepository,
  prismaRegistrationRepository,
} from "@/infrastructure/repositories";
import { getUserDashboardCircles } from "@/domain/usecases/get-user-dashboard-circles";
import { getUserUpcomingMoments } from "@/domain/usecases/get-user-upcoming-moments";
import { getUserPastMoments } from "@/domain/usecases/get-user-past-moments";
import { getHostUpcomingMoments } from "@/domain/usecases/get-host-upcoming-moments";
import { getHostPastMoments } from "@/domain/usecases/get-host-past-moments";
import { DashboardCircleCard } from "@/components/circles/dashboard-circle-card";
import { DashboardMomentCard } from "@/components/moments/dashboard-moment-card";
import type { DashboardMode } from "@/domain/models/user";
import { Link } from "@/i18n/navigation";

export async function DashboardContent({
  userId,
  activeTab,
  mode,
}: {
  userId: string;
  activeTab: "moments" | "circles";
  mode: DashboardMode | null;
}) {
  // Transition PUBLISHED → PAST pour les Moments terminés
  await prismaMomentRepository.transitionPastMoments();

  const [upcomingRegistrations, pastRegistrations, circles] = await Promise.all([
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

  const t = await getTranslations("Dashboard");

  // ─── Mode ORGANIZER ──────────────────────────────────────────────────────────
  if (mode === "ORGANIZER") {
    const [hostUpcoming, hostPast] = await Promise.all([
      getHostUpcomingMoments(userId, { momentRepository: prismaMomentRepository }),
      getHostPastMoments(userId, { momentRepository: prismaMomentRepository }),
    ]);

    const hostCircles = circles.filter((c) => c.memberRole === "HOST");
    const hasHostMoments = hostUpcoming.length > 0 || hostPast.length > 0;

    if (activeTab === "moments") {
      return (
        <section>
          {!hasHostMoments ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
              <p className="text-muted-foreground text-sm">{t("noMomentsOrganizer")}</p>
              <p className="text-muted-foreground mt-1 text-xs">{t("noMomentsOrganizerHint")}</p>
            </div>
          ) : (
            <div>
              {hostUpcoming.map((moment, i) => (
                <DashboardMomentCard
                  key={moment.id}
                  variant="organizer"
                  moment={moment}
                  isLast={i === hostUpcoming.length - 1 && hostPast.length === 0}
                />
              ))}

              {hostUpcoming.length > 0 && hostPast.length > 0 && (
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

              {hostUpcoming.length === 0 && hostPast.length > 0 && (
                <p className="text-muted-foreground mb-4 text-xs font-semibold uppercase tracking-wider">
                  {t("pastMoments")}
                </p>
              )}

              {hostPast.map((moment, i) => (
                <DashboardMomentCard
                  key={moment.id}
                  variant="organizer"
                  moment={moment}
                  isLast={i === hostPast.length - 1}
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
        {hostCircles.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
            <p className="text-muted-foreground text-sm">{t("noCirclesOrganizer")}</p>
            <p className="text-muted-foreground mt-1 text-xs">{t("noCirclesOrganizerHint")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {hostCircles.map((circle) => (
              <DashboardCircleCard key={circle.id} circle={circle} />
            ))}
          </div>
        )}
      </section>
    );
  }

  // ─── Mode PARTICIPANT (ou null avec activité → traité comme participant) ─────
  // HOST implique PLAYER (un seul row membership) → afficher toutes les communautés
  // dont on est membre, qu'on soit HOST ou PLAYER. La distinction vient des CTAs,
  // pas du contenu affiché.
  const participantCircles = circles;
  const participantUpcoming = upcomingRegistrations;
  const participantPast = pastRegistrations;
  const hasMoments = participantUpcoming.length > 0 || participantPast.length > 0;

  if (activeTab === "moments") {
    return (
      <section>
        {!hasMoments ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
            <p className="text-muted-foreground text-sm">{t("noMoments")}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              <Link href="/explorer" className="hover:text-foreground underline underline-offset-4">
                {t("noMomentsHintExplore")}
              </Link>
            </p>
          </div>
        ) : (
          <div>
            {participantUpcoming.map((reg, i) => (
              <DashboardMomentCard
                key={reg.id}
                variant="participant"
                registration={reg}
                isLast={i === participantUpcoming.length - 1 && participantPast.length === 0}
              />
            ))}

            {participantUpcoming.length > 0 && participantPast.length > 0 && (
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

            {participantUpcoming.length === 0 && participantPast.length > 0 && (
              <p className="text-muted-foreground mb-4 text-xs font-semibold uppercase tracking-wider">
                {t("pastMoments")}
              </p>
            )}

            {participantPast.map((reg, i) => (
              <DashboardMomentCard
                key={reg.id}
                variant="participant"
                registration={reg}
                isLast={i === participantPast.length - 1}
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
      {participantCircles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <p className="text-muted-foreground text-sm">{t("emptyCircles")}</p>
          <p className="text-muted-foreground mt-1 text-xs">{t("emptyCirclesHint")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {participantCircles.map((circle) => (
            <DashboardCircleCard key={circle.id} circle={circle} />
          ))}
        </div>
      )}
    </section>
  );
}
