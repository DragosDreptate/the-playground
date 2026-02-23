import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth.config";
import {
  prismaCircleRepository,
  prismaRegistrationRepository,
} from "@/infrastructure/repositories";
import { getUserCirclesWithRole } from "@/domain/usecases/get-user-circles-with-role";
import { getUserUpcomingMoments } from "@/domain/usecases/get-user-upcoming-moments";
import { getUserPastMoments } from "@/domain/usecases/get-user-past-moments";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Users, Compass } from "lucide-react";

export default async function WelcomePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const userId = session.user.id;

  const [circles, upcomingMoments, pastMoments] = await Promise.all([
    getUserCirclesWithRole(userId, { circleRepository: prismaCircleRepository }),
    getUserUpcomingMoments(userId, { registrationRepository: prismaRegistrationRepository }),
    getUserPastMoments(userId, { registrationRepository: prismaRegistrationRepository }),
  ]);

  // Si l'utilisateur a de l'activité, il n'a rien à faire ici
  const hasActivity =
    circles.length > 0 || upcomingMoments.length > 0 || pastMoments.length > 0;

  if (hasActivity) {
    redirect("/dashboard");
  }

  const firstName = session.user.name?.split(" ")[0];
  const t = await getTranslations("Welcome");

  return (
    <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center">
      <div className="mx-auto w-full max-w-lg space-y-8">
        {/* Greeting */}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            {firstName ? t("greeting", { name: firstName }) : t("greetingAnonymous")}
          </h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Créer ma Communauté */}
          <div className="flex flex-col gap-4 rounded-xl border bg-card p-6">
            <Users className="size-10 text-primary" />
            <div className="space-y-1">
              <h2 className="font-semibold">{t("createCircle.title")}</h2>
              <p className="text-muted-foreground text-sm">{t("createCircle.description")}</p>
            </div>
            <Button asChild className="mt-auto w-full">
              <Link href="/dashboard/circles/new">{t("createCircle.cta")}</Link>
            </Button>
          </div>

          {/* Découvrir des Communautés */}
          <div className="flex flex-col gap-4 rounded-xl border bg-card p-6">
            <Compass className="size-10 text-primary" />
            <div className="space-y-1">
              <h2 className="font-semibold">{t("explore.title")}</h2>
              <p className="text-muted-foreground text-sm">{t("explore.description")}</p>
            </div>
            <Button asChild variant="outline" className="mt-auto w-full">
              <Link href="/explorer">{t("explore.cta")}</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
