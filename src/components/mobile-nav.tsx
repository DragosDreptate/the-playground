"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Menu, Compass, LayoutDashboard, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleToggle } from "@/components/locale-toggle";

type MobileNavProps = {
  isAuthenticated: boolean;
};

export function MobileNav({ isAuthenticated }: MobileNavProps) {
  const tExplorer = useTranslations("Explorer");
  const tDashboard = useTranslations("Dashboard");
  const tAuth = useTranslations("Auth");
  const pathname = usePathname();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="md:hidden">
          <Menu className="size-5" />
          <span className="sr-only">Menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {isAuthenticated ? (
          <>
            <DropdownMenuItem asChild>
              <Link href="/explorer" className={`cursor-pointer ${pathname.startsWith("/explorer") ? "text-foreground font-medium" : ""}`}>
                <Compass className="mr-2 size-4" />
                {tExplorer("navLink")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard" className={`cursor-pointer ${pathname.startsWith("/dashboard") ? "text-foreground font-medium" : ""}`}>
                <LayoutDashboard className="mr-2 size-4" />
                {tDashboard("title")}
              </Link>
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem asChild>
            <Link href="/auth/sign-in" className="cursor-pointer">
              <LogIn className="mr-2 size-4" />
              {tAuth("signIn.title")}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between px-2 py-1.5">
          <LocaleToggle />
          <ThemeToggle />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
