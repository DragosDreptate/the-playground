import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth.config";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  const isOnboarding = !session.user.onboardingCompleted;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader user={session.user} hideNav={isOnboarding} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
