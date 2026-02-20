import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth.config";
import { Link } from "@/i18n/navigation";
import { signOutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { getTranslations } from "next-intl/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  const t = await getTranslations("Auth");

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/dashboard" className="text-lg font-semibold">
            The Playground
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/profile"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              {session.user.email}
            </Link>
            <ThemeToggle />
            <form action={signOutAction}>
              <Button variant="ghost" size="sm" type="submit">
                {t("signOut")}
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
