import { auth } from "@/infrastructure/auth/auth.config";
import { getCachedDashboardCircles, getCachedHostMoments } from "@/lib/dashboard-cache";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { Plus } from "lucide-react";
import { CreateMomentDropdown } from "./create-moment-dropdown";

/**
 * CTA "Créer un événement" adaptatif selon le nombre de communautés hébergées :
 *
 *   0 événement   → null (le guide OrganizerMomentsOnboardingGuide affiche son propre CTA)
 *   0 communauté  → redirect /dashboard/circles/new (créer une communauté d'abord)
 *   1 communauté  → redirect direct /dashboard/circles/[slug]/moments/new
 *   2+ communautés → Popover dropdown de sélection de la communauté cible
 */
export async function CreateMomentButton() {
  const [session, t] = await Promise.all([auth(), getTranslations("Dashboard")]);

  if (!session?.user?.id) return null;

  const [allCircles, { upcoming, past }] = await Promise.all([
    getCachedDashboardCircles(session.user.id),
    getCachedHostMoments(session.user.id),
  ]);

  // 0 événement → le guide affiche son propre CTA, pas de doublon dans le header
  if (upcoming.length === 0 && past.length === 0) return null;

  const hostCircles = allCircles.filter((c) => c.memberRole === "HOST");

  // 0 communauté → guider vers la création de communauté d'abord
  if (hostCircles.length === 0) {
    return (
      <Button asChild size="sm" className="w-full sm:w-auto gap-1.5">
        <Link href="/dashboard/circles/new">
          <Plus className="size-3.5" />
          {t("createCircleFirst")}
        </Link>
      </Button>
    );
  }

  // 1 communauté → redirect direct, pas de dropdown
  if (hostCircles.length === 1) {
    return (
      <Button asChild size="sm" className="w-full sm:w-auto gap-1.5">
        <Link href={`/dashboard/circles/${hostCircles[0].slug}/moments/new`}>
          <Plus className="size-3.5" />
          {t("createMoment")}
        </Link>
      </Button>
    );
  }

  // 2+ communautés → dropdown de sélection
  return (
    <CreateMomentDropdown
      circles={hostCircles.map((c) => ({
        slug: c.slug,
        name: c.name,
        logo: c.logo,
      }))}
    />
  );
}
