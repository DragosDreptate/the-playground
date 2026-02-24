"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { BarChart3, Users, CircleDot, CalendarDays, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { key: "dashboard", href: "/admin", icon: BarChart3 },
  { key: "users", href: "/admin/users", icon: Users },
  { key: "circles", href: "/admin/circles", icon: CircleDot },
  { key: "moments", href: "/admin/moments", icon: CalendarDays },
] as const;

export function AdminSidebar() {
  const t = useTranslations("Admin");
  const pathname = usePathname();

  // Strip locale prefix for matching
  const cleanPath = pathname.replace(/^\/(fr|en)/, "");

  function isActive(href: string) {
    if (href === "/admin") return cleanPath === "/admin";
    return cleanPath.startsWith(href);
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border/40 bg-muted/30">
      {/* Header */}
      <div className="flex h-14 items-center border-b border-border/40 px-4">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-[5px] bg-gradient-to-br from-pink-500 to-violet-500">
            <svg width="10" height="12" viewBox="0 0 10 12" fill="none" className="ml-px">
              <polygon points="0,0 0,12 10,6" fill="white" />
            </svg>
          </div>
          <span className="text-sm font-semibold">{t("title")}</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-3">
        {navItems.map(({ key, href, icon: Icon }) => (
          <Link
            key={key}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive(href)
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            {t(key)}
          </Link>
        ))}

        {/* Back to site */}
        <div className="mt-2 border-t border-border/40 pt-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            {t("backToSite")}
          </Link>
        </div>
      </nav>
    </aside>
  );
}
