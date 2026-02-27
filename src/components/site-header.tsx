"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleToggle } from "@/components/locale-toggle";
import { UserMenu } from "@/components/user-menu";
import { MobileNav } from "@/components/mobile-nav";
import { Compass, LayoutDashboard } from "lucide-react";

export function SiteHeader() {
  const { data: session } = useSession();
  const t = useTranslations("Auth");
  const tExplorer = useTranslations("Explorer");
  const tDashboard = useTranslations("Dashboard");

  const user = session?.user;
  const dashboardHref = user?.dashboardMode == null ? "/dashboard/welcome" : "/dashboard";
  const pathname = usePathname();
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    setIsPWA(
      window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as { standalone?: boolean }).standalone === true
    );
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center px-4">
        {/* Logo — left */}
        <Link href={isPWA && user ? dashboardHref : "/"} className="flex items-center gap-2 shrink-0">
          <div className="flex size-6 items-center justify-center rounded-[5px] bg-gradient-to-br from-pink-500 to-violet-500">
            <svg width="10" height="12" viewBox="0 0 10 12" fill="none" className="ml-px">
              <polygon points="0,0 0,12 10,6" fill="white" />
            </svg>
          </div>
          <span className="text-[15px] font-extrabold tracking-[-0.4px]">the&thinsp;<span className="text-primary">playground</span></span>
        </Link>

        {/* Nav — center (desktop only) */}
        <nav className="hidden flex-1 items-center justify-center gap-6 md:flex">
          {user && (
            <>
              <Link
                href="/explorer"
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${pathname.startsWith("/explorer") ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Compass className="size-3.5" />
                {tExplorer("navLink")}
              </Link>
              <Link
                href={dashboardHref}
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${pathname.startsWith("/dashboard") ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
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
          <MobileNav isAuthenticated={!!user} dashboardHref={dashboardHref} />
        </div>
      </div>
    </header>
  );
}
