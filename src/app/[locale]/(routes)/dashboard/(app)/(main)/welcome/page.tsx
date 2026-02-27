import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth.config";
import {
  prismaCircleRepository,
  prismaRegistrationRepository,
  prismaUserRepository,
} from "@/infrastructure/repositories";
import { getUserCirclesWithRole } from "@/domain/usecases/get-user-circles-with-role";
import { getUserUpcomingMoments } from "@/domain/usecases/get-user-upcoming-moments";
import { getUserPastMoments } from "@/domain/usecases/get-user-past-moments";
import { setDashboardMode } from "@/domain/usecases/set-dashboard-mode";
import { WelcomeModeChoice } from "./_components/welcome-mode-choice";

export default async function WelcomePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  // Si le mode est déjà défini → pas besoin de passer par le welcome
  if (session.user.dashboardMode !== null) {
    redirect("/dashboard");
  }

  const userId = session.user.id;

  const [circles, upcomingMoments, pastMoments] = await Promise.all([
    getUserCirclesWithRole(userId, { circleRepository: prismaCircleRepository }),
    getUserUpcomingMoments(userId, { registrationRepository: prismaRegistrationRepository }),
    getUserPastMoments(userId, { registrationRepository: prismaRegistrationRepository }),
  ]);

  // Utilisateur existant avec activité mais sans mode → PARTICIPANT par défaut
  // (évite une boucle infinie avec page.tsx qui redirige vers welcome si mode=null)
  const hasActivity =
    circles.length > 0 || upcomingMoments.length > 0 || pastMoments.length > 0;

  if (hasActivity) {
    await setDashboardMode(userId, "PARTICIPANT", { userRepository: prismaUserRepository });
    redirect("/dashboard");
  }

  const firstName = session.user.name?.split(" ")[0] ?? null;

  return (
    <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center">
      <WelcomeModeChoice firstName={firstName} />
    </div>
  );
}
