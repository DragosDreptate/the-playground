import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCachedSession } from "@/lib/auth-cache";
import { shouldRedirectToSetup } from "@/lib/onboarding";

export default async function OnboardedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCachedSession();

  if (shouldRedirectToSetup(session?.user)) {
    // Redirection dans la langue courante : la page setup enregistre la langue
    // de son URL comme langue des emails, elle ne doit pas retomber sur le défaut.
    redirect({ href: "/dashboard/profile/setup", locale: await getLocale() });
  }

  return <>{children}</>;
}
