import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/auth-cache";
import { shouldRedirectToSetup } from "@/lib/onboarding";

export default async function OnboardedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCachedSession();

  if (shouldRedirectToSetup(session?.user)) {
    redirect("/dashboard/profile/setup");
  }

  return <>{children}</>;
}
