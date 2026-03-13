import { after } from "next/server";
import { getTranslations } from "next-intl/server";
import { measureTime } from "@/lib/perf-logger";
import {
  prismaMomentRepository,
  prismaRegistrationRepository,
} from "@/infrastructure/repositories";
import { getCachedDashboardCircles, getCachedHostMoments } from "@/lib/dashboard-cache";
import { DashboardCircleCard } from "@/components/circles/dashboard-circle-card";
import { DashboardMomentCard } from "@/components/moments/dashboard-moment-card";
import type { DashboardMode } from "@/domain/models/user";
import { Link } from "@/i18n/navigation";
import { OrganizerOnboardingGuide } from "./organizer-onboarding-guide";
import { OrganizerMomentsOnboardingGuide } from "./organizer-moments-onboarding-guide";

export async function DashboardContent({
  userId,
  activeTab,
  mode,
}: {
  userId: string;
  activeTab: "moments" | "circles";
  mode: DashboardMode | null;
}) {
  // Transition PUBLISHED → PAST pour les Moments terminés — fire-and-forget après la réponse
  after(() => prismaMomentRepository.transitionPastMoments());

  // Requête fusionnée : upcoming + past en un seul round-trip Neon (au lieu de 2)
  const [{ upcoming: upcomingRegistrations, past: pastRegistrations }, circles] =
    await measureTime("dashboard-content:phase1", () =>
      Promise.all([
        measureTime("dashboard-content:registrations", () =>
          prismaRegistrationRepository.findAllForUserDashboard(userId)
        ),
        measureTime("dashboard-content:circles", () =>
          getCachedDashboardCircles(userId)
        ),
      ])
    );

  const t = await getTranslations("Dashboard");

  // ─── Mode ORGANIZER ──────────────────────────────────────────────────────────
  if (mode === "ORGANIZER") {
    // Requête fusionnée : upcoming + past en un seul round-trip Neon (au lieu de 2)
    const { upcoming: hostUpcoming, past: hostPast } =
      await measureTime("dashboard-content:phase2-organizer", () =>
        getCachedHostMoments(userId)
      );

    const hostCircles = circles.filter((c) => c.memberRole === "HOST");
    const hasHostMoments = hostUpcoming.length > 0 || hostPast.length > 0;

    if (activeTab === "moments") {
      return (
        <section>
          {!hasHostMoments ? (
            <OrganizerMomentsOnboardingGuide
              hostCircles={hostCircles.map((c) => ({ slug: c.slug, name: c.name, logo: c.logo }))}
            />
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
          <OrganizerOnboardingGuide />
        ) : (
          <div className="flex flex-col gap-3">
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

  // Slugs des Communautés dont l'user est HOST — pour afficher le badge Organisateur
  // sur les événements de ses propres communautés, même en mode Participant.
  const hostCircleSlugs = new Set(
    circles.filter((c) => c.memberRole === "HOST").map((c) => c.slug)
  );
  const hasMoments = participantUpcoming.length > 0 || participantPast.length > 0;

  if (activeTab === "moments") {
    return (
      <section>
        {!hasMoments ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
            <p className="text-muted-foreground text-sm">{t("noMoments")}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              <Link href="/explorer?tab=moments" className="hover:text-foreground underline underline-offset-4">
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
                isHost={hostCircleSlugs.has(reg.moment.circleSlug)}
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
                isHost={hostCircleSlugs.has(reg.moment.circleSlug)}
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
          <p className="text-muted-foreground mt-1 text-xs">
            <Link href="/explorer" className="hover:text-foreground underline underline-offset-4">
              {t("emptyCirclesHintExplore")}
            </Link>
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {participantCircles.map((circle) => (
            <DashboardCircleCard key={circle.id} circle={circle} />
          ))}
        </div>
      )}
    </section>
  );
}
