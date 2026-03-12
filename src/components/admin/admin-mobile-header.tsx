"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Menu, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { adminNavItems, adminInsightItems, isAdminPathActive } from "./admin-nav";
import { AdminLogo } from "./admin-logo";

export function AdminMobileHeader() {
  const t = useTranslations("Admin");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const cleanPath = pathname.replace(/^\/(fr|en)/, "");

  function isActive(href: string) {
    return isAdminPathActive(cleanPath, href);
  }

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-border/40 bg-muted/30 px-4 md:hidden">
      <Link href="/admin" className="flex items-center gap-2">
        <AdminLogo />
        <span className="text-sm font-semibold">{t("title")}</span>
      </Link>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            aria-label="Menu"
            className="ml-auto flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Menu className="size-5" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-56 p-0">
          <SheetTitle className="sr-only">{t("title")}</SheetTitle>
          <div className="flex h-14 items-center border-b border-border/40 px-4">
            <Link href="/admin" className="flex items-center gap-2" onClick={() => setOpen(false)}>
              <AdminLogo />
              <span className="text-sm font-semibold">{t("title")}</span>
            </Link>
          </div>
          <nav className="flex flex-col gap-1 p-3">
            {adminNavItems.map(({ key, href, icon: Icon }) => (
              <Link
                key={key}
                href={href}
                onClick={() => setOpen(false)}
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
                  onClick={() => setOpen(false)}
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
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
                {t("backToSite")}
              </Link>
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
