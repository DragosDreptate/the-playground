import { getCachedSession } from "@/lib/auth-cache";
import { getCachedDashboardCircles } from "@/lib/dashboard-cache";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { Plus } from "lucide-react";
import { CreateMomentDropdown } from "./create-moment-dropdown";

/**
 * CTA "Créer un événement" adaptatif selon le nombre de communautés hébergées :
 *
 *   0 communauté host → null (pas d'organisateur, pas de CTA)
 *   1 communauté      → redirect direct /dashboard/circles/[slug]/moments/new
 *   2+ communautés    → Popover dropdown de sélection de la communauté cible
 */
export async function CreateMomentButton() {
  const [session, t] = await Promise.all([getCachedSession(), getTranslations("Dashboard")]);

  if (!session?.user?.id) return null;

  const allCircles = await getCachedDashboardCircles(session.user.id);
  const hostCircles = allCircles.filter((c) => c.memberRole === "HOST");

  // 0 communauté host → pas de CTA (le CTA "Créer une Communauté" est sur le tab Communautés)
  if (hostCircles.length === 0) return null;

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
