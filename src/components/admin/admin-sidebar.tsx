"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminNavItems, adminInsightItems, isAdminPathActive } from "./admin-nav";
import { AdminLogo } from "./admin-logo";

export function AdminSidebar() {
  const t = useTranslations("Admin");
  const pathname = usePathname();

  // Strip locale prefix for matching
  const cleanPath = pathname.replace(/^\/(fr|en)/, "");

  function isActive(href: string) {
    return isAdminPathActive(cleanPath, href);
  }

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-border/40 bg-muted/30 md:flex">
      {/* Header */}
      <div className="flex h-14 items-center border-b border-border/40 px-4">
        <Link href="/admin" className="flex items-center gap-2">
          <AdminLogo />
          <span className="text-sm font-semibold">{t("title")}</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-3">
        {adminNavItems.map(({ key, href, icon: Icon }) => (
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

        {/* Insights */}
        <div className="mt-2 border-t border-border/40 pt-2">
          <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
            {t("insights")}
          </p>
          {adminInsightItems.map(({ key, href, icon: Icon }) => (
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
        </div>

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
