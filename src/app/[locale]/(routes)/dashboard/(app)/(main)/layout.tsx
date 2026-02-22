import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth.config";
import { shouldRedirectToSetup } from "@/lib/onboarding";

export default async function OnboardedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (shouldRedirectToSetup(session?.user)) {
    redirect("/dashboard/profile/setup");
  }

  return <>{children}</>;
}
