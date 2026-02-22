import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleToggle } from "@/components/locale-toggle";
import { UserMenu } from "@/components/user-menu";
import { MobileNav } from "@/components/mobile-nav";
import { getTranslations } from "next-intl/server";
import { Compass, LayoutDashboard } from "lucide-react";

type SiteHeaderProps = {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: "USER" | "ADMIN";
  } | null;
};

export async function SiteHeader({ user }: SiteHeaderProps) {
  const t = await getTranslations("Auth");
  const tExplorer = await getTranslations("Explorer");
  const tDashboard = await getTranslations("Dashboard");

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center px-4">
        {/* Logo — left */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="flex size-6 items-center justify-center rounded-[5px] bg-gradient-to-br from-pink-500 to-violet-500">
            <svg width="10" height="12" viewBox="0 0 10 12" fill="none" className="ml-px">
              <polygon points="0,0 0,12 10,6" fill="white" />
            </svg>
          </div>
          <span className="text-lg font-semibold">The Playground</span>
        </Link>

        {/* Nav — center (desktop only) */}
        <nav className="hidden flex-1 items-center justify-center gap-6 md:flex">
          {user && (
            <>
              <Link
                href="/explorer"
                className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm font-medium transition-colors"
              >
                <Compass className="size-3.5" />
                {tExplorer("navLink")}
              </Link>
              <Link
                href="/dashboard"
                className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm font-medium transition-colors"
              >
                <LayoutDashboard className="size-3.5" />
                {tDashboard("title")}
              </Link>
            </>
          )}
        </nav>

        {/* Spacer for mobile (pushes actions to the right) */}
        <div className="flex-1 md:hidden" />

        {/* Actions — right */}
        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden md:flex md:items-center md:gap-2">
            <LocaleToggle />
            <ThemeToggle />
          </div>
          {user ? (
            <UserMenu user={user} />
          ) : (
            <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex">
              <Link href="/auth/sign-in">{t("signIn.title")}</Link>
            </Button>
          )}
          <MobileNav isAuthenticated={!!user} />
        </div>
      </div>
    </header>
  );
}
