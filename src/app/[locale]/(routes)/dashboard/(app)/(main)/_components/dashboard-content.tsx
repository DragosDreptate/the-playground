import { getTranslations } from "next-intl/server";
import { measureTime } from "@/lib/perf-logger";
import { prismaRegistrationRepository } from "@/infrastructure/repositories";
import { getCachedDashboardCircles, getCachedHostMoments } from "@/lib/dashboard-cache";
import { DashboardCircleCard } from "@/components/circles/dashboard-circle-card";
import { DashboardMomentCard } from "@/components/moments/dashboard-moment-card";
import { Link } from "@/i18n/navigation";
import { PastEventsList } from "./past-events-list";
import type { RegistrationWithMoment } from "@/domain/models/registration";
import type { HostMomentSummary } from "@/domain/models/moment";

type MergedItem =
  | { type: "registration"; data: RegistrationWithMoment; startsAt: Date }
  | { type: "host"; data: HostMomentSummary; startsAt: Date };

function isHostRelated(item: MergedItem, hostSlugs: Set<string>): boolean {
  if (item.type === "host") return true;
  return hostSlugs.has(item.data.moment.circleSlug);
}

export async function DashboardContent({
  userId,
  activeTab,
  hostOnly = false,
}: {
  userId: string;
  activeTab: "moments" | "circles";
  hostOnly?: boolean;
}) {
  // La transition PUBLISHED → PAST est gérée par le cron /api/cron/transition-past-moments
  // (toutes les 5 min) — plus fiable que `after()` sur Vercel serverless ("best effort").

  // Requêtes fusionnées : inscriptions + communautés + host moments en parallèle
  const [
    { upcoming: upcomingRegistrations, past: pastRegistrations },
    circles,
    { upcoming: hostUpcoming, past: hostPast },
  ] = await measureTime("dashboard-content:phase1", () =>
    Promise.all([
      measureTime("dashboard-content:registrations", () =>
        prismaRegistrationRepository.findAllForUserDashboard(userId)
      ),
      measureTime("dashboard-content:circles", () =>
        getCachedDashboardCircles(userId)
      ),
      measureTime("dashboard-content:host-moments", () =>
        getCachedHostMoments(userId)
      ),
    ])
  );

  const t = await getTranslations("Dashboard");

  // Dédupliquer : exclure les host moments déjà couverts par les inscriptions (= brouillons uniquement)
  const registeredMomentIds = new Set([
    ...upcomingRegistrations.map((r) => r.momentId),
    ...pastRegistrations.map((r) => r.momentId),
  ]);
  const hostOnlyUpcoming = hostUpcoming.filter((m) => !registeredMomentIds.has(m.id));
  const hostOnlyPast = hostPast.filter((m) => !registeredMomentIds.has(m.id));

  const hostCircleSlugs = new Set(
    circles.filter((c) => c.memberRole === "HOST").map((c) => c.slug)
  );

  const mergedUpcoming: MergedItem[] = [
    ...upcomingRegistrations.map((r) => ({ type: "registration" as const, data: r, startsAt: r.moment.startsAt })),
    ...hostOnlyUpcoming.map((m) => ({ type: "host" as const, data: m, startsAt: m.startsAt })),
  ].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  const mergedPast: MergedItem[] = [
    ...pastRegistrations.map((r) => ({ type: "registration" as const, data: r, startsAt: r.moment.startsAt })),
    ...hostOnlyPast.map((m) => ({ type: "host" as const, data: m, startsAt: m.startsAt })),
  ].sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());

  const filteredUpcoming = hostOnly
    ? mergedUpcoming.filter((i) => isHostRelated(i, hostCircleSlugs))
    : mergedUpcoming;

  const filteredPast = hostOnly
    ? mergedPast.filter((i) => isHostRelated(i, hostCircleSlugs))
    : mergedPast;

  const filteredCircles = hostOnly
    ? circles.filter((c) => c.memberRole === "HOST")
    : circles;

  const hasMoments = filteredUpcoming.length > 0 || filteredPast.length > 0;

  if (activeTab === "moments") {
    return (
      <section>
        {!hasMoments ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
            <p className="text-muted-foreground text-sm">
              {hostOnly ? t("noMomentsHostOnly") : t("noMoments")}
            </p>
            {!hostOnly && (
              <p className="text-muted-foreground mt-1 text-xs">
                <Link href="/explorer?tab=moments" className="hover:text-foreground underline underline-offset-4">
                  {t("noMomentsHintExplore")}
                </Link>
              </p>
            )}
          </div>
        ) : (
          <div>
            {filteredUpcoming.map((item, i) =>
              item.type === "registration" ? (
                <DashboardMomentCard
                  key={item.data.id}
                  variant="participant"
                  registration={item.data}
                  isHost={hostCircleSlugs.has(item.data.moment.circleSlug)}
                  isLast={i === filteredUpcoming.length - 1 && filteredPast.length === 0}
                />
              ) : (
                <DashboardMomentCard
                  key={item.data.id}
                  variant="organizer"
                  moment={item.data}
                  isLast={i === filteredUpcoming.length - 1 && filteredPast.length === 0}
                />
              )
            )}

            {filteredUpcoming.length > 0 && filteredPast.length > 0 && (
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

            {filteredUpcoming.length === 0 && filteredPast.length > 0 && (
              <p className="text-muted-foreground mb-4 text-xs font-semibold uppercase tracking-wider">
                {t("pastMoments")}
              </p>
            )}

            <PastEventsList>
              {filteredPast.map((item, i) =>
                item.type === "registration" ? (
                  <DashboardMomentCard
                    key={item.data.id}
                    variant="participant"
                    registration={item.data}
                    isHost={hostCircleSlugs.has(item.data.moment.circleSlug)}
                    isLast={i === filteredPast.length - 1}
                    isPast
                  />
                ) : (
                  <DashboardMomentCard
                    key={item.data.id}
                    variant="organizer"
                    moment={item.data}
                    isLast={i === filteredPast.length - 1}
                    isPast
                  />
                )
              )}
            </PastEventsList>
          </div>
        )}
      </section>
    );
  }

  // Tab communautés
  return (
    <section>
      {filteredCircles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <p className="text-muted-foreground text-sm">
            {hostOnly ? t("emptyCirclesHostOnly") : t("emptyCircles")}
          </p>
          {!hostOnly && (
            <p className="text-muted-foreground mt-1 text-xs">
              <Link href="/explorer" className="hover:text-foreground underline underline-offset-4">
                {t("emptyCirclesHintExplore")}
              </Link>
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredCircles.map((circle) => (
            <DashboardCircleCard key={circle.id} circle={circle} />
          ))}
        </div>
      )}
    </section>
  );
}
