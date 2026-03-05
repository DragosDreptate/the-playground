import { auth } from "@/infrastructure/auth/auth.config";
import { prismaCircleRepository } from "@/infrastructure/repositories";
import { getUserDashboardCircles } from "@/domain/usecases/get-user-dashboard-circles";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/**
 * Bouton "Créer une Communauté" dans le header des tabs.
 * Retourne null quand l'organisateur n'a aucune communauté :
 * le guide OrganizerOnboardingGuide affiche son propre CTA dans ce cas.
 */
export async function CreateCircleButton() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const allCircles = await getUserDashboardCircles(session.user.id, {
    circleRepository: prismaCircleRepository,
  });

  const hostCircles = allCircles.filter((c) => c.memberRole === "HOST");

  // 0 communauté → le guide affiche son propre CTA, pas de doublon dans le header
  if (hostCircles.length === 0) return null;

  const t = await getTranslations("Dashboard");

  return (
    <Button asChild size="sm" className="w-full sm:w-auto">
      <Link href="/dashboard/circles/new">{t("createCircle")}</Link>
    </Button>
  );
}
