"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Compass, LayoutDashboard, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type MobileNavProps = {
  isAuthenticated: boolean;
  dashboardHref?: string;
};

export function MobileNav({ isAuthenticated, dashboardHref = "/dashboard" }: MobileNavProps) {
  const tExplorer = useTranslations("Explorer");
  const tDashboard = useTranslations("Dashboard");
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 items-center justify-center gap-1 md:hidden">
      <MobileNavItem
        href="/explorer"
        icon={Compass}
        label={tExplorer("navLink")}
        active={pathname.startsWith("/explorer")}
      />
      {isAuthenticated && (
        <MobileNavItem
          href={dashboardHref}
          icon={LayoutDashboard}
          label={tDashboard("title")}
          active={pathname.startsWith("/dashboard")}
        />
      )}
    </nav>
  );
}

function MobileNavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex size-11 items-center justify-center rounded-md transition-colors",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      )}
    >
      <Icon className="size-5" />
      {active && (
        <span
          aria-hidden
          className="bg-primary absolute bottom-1.5 size-1 rounded-full"
        />
      )}
    </Link>
  );
}
