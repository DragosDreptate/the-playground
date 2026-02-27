import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth.config";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleToggle } from "@/components/locale-toggle";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header minimal : logo (lien home) + toggles */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-4">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-[5px] bg-gradient-to-br from-pink-500 to-violet-500">
              <svg width="10" height="12" viewBox="0 0 10 12" fill="none" className="ml-px">
                <polygon points="0,0 0,12 10,6" fill="white" />
              </svg>
            </div>
            <span className="text-[15px] font-extrabold tracking-[-0.4px]">the&thinsp;<span className="text-primary">playground</span></span>
          </Link>

          <div className="flex flex-1 items-center justify-end gap-3">
            <LocaleToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>
      {/* Pas de footer — l'utilisateur ne doit pas pouvoir naviguer hors de l'onboarding */}
    </div>
  );
}
