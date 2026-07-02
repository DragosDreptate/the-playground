"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  Compass,
  Globe,
  LayoutDashboard,
  LogOut,
  Moon,
  Shield,
  Sun,
  User,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/user-avatar";
import { avatarGradientSeed } from "@/lib/avatar";
import { cn } from "@/lib/utils";
import { useLocaleSwitcher } from "@/lib/use-locale-switcher";

type UserMenuProps = {
  user: {
    id?: string | null;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: "USER" | "ADMIN";
  };
};

export function UserMenu({ user }: UserMenuProps) {
  const t = useTranslations("UserMenu");
  const tExplorer = useTranslations("Explorer");
  const email = user.email ?? "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-full p-0.5 outline-none transition-opacity hover:opacity-80">
        <UserAvatar
          name={user.name}
          email={email}
          image={user.image}
          gradient={user.id ? avatarGradientSeed({ id: user.id }) : undefined}
          size="sm"
        />
        <ChevronDown className="text-muted-foreground h-3.5 w-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            {user.name && (
              <p className="text-sm font-medium leading-none">{user.name}</p>
            )}
            <p className="text-muted-foreground truncate text-xs">{email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="md:hidden">
          <Link href="/explorer" className="cursor-pointer">
            <Compass className="mr-2 h-4 w-4" />
            {tExplorer("navLink")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="cursor-pointer">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            {t("dashboard")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/profile" className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            {t("profile")}
          </Link>
        </DropdownMenuItem>
        {user.role === "ADMIN" && (
          <DropdownMenuItem asChild>
            <Link href="/admin" className="cursor-pointer">
              <Shield className="mr-2 h-4 w-4" />
              Admin
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="md:hidden" />
        <DropdownMenuGroup className="md:hidden">
          <PreferencesBlock />
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={() => {
            signOut({ callbackUrl: "/" });
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PreferencesBlock() {
  const t = useTranslations("UserMenu.preferences");
  return (
    <>
      <PreferenceRow icon={Globe} label={t("language")}>
        <LocaleSegmented ariaLabel={t("language")} />
      </PreferenceRow>
      <PreferenceRow icon={Sun} label={t("theme")}>
        <ThemeSegmented ariaLabel={t("theme")} />
      </PreferenceRow>
    </>
  );
}

function PreferenceRow({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-2 py-1.5">
      <span className="flex items-center gap-2 text-sm">
        <Icon className="text-muted-foreground size-4" />
        {label}
      </span>
      {children}
    </div>
  );
}

function LocaleSegmented({ ariaLabel }: { ariaLabel: string }) {
  const { locale, locales, switchLocale, isPending } = useLocaleSwitcher();
  return (
    <SegmentedGroup ariaLabel={ariaLabel}>
      {locales.map((l) => (
        <SegmentedButton
          key={l}
          active={l === locale}
          disabled={isPending}
          onClick={() => switchLocale(l)}
        >
          {l.toUpperCase()}
        </SegmentedButton>
      ))}
    </SegmentedGroup>
  );
}

function ThemeSegmented({ ariaLabel }: { ariaLabel: string }) {
  const t = useTranslations("UserMenu.preferences");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const current = mounted ? theme : undefined;

  return (
    <SegmentedGroup ariaLabel={ariaLabel}>
      <SegmentedButton
        active={current === "light"}
        ariaLabel={t("light")}
        onClick={() => setTheme("light")}
      >
        <Sun className="size-3.5" />
      </SegmentedButton>
      <SegmentedButton
        active={current === "dark"}
        ariaLabel={t("dark")}
        onClick={() => setTheme("dark")}
      >
        <Moon className="size-3.5" />
      </SegmentedButton>
    </SegmentedGroup>
  );
}

function SegmentedGroup({
  ariaLabel,
  children,
}: {
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="border-border bg-muted inline-flex items-center rounded-md border p-0.5"
    >
      {children}
    </div>
  );
}

function SegmentedButton({
  active,
  disabled,
  ariaLabel,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-6 min-w-7 items-center justify-center rounded-sm px-2 text-xs font-medium transition-colors",
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
        disabled && "opacity-50"
      )}
    >
      {children}
    </button>
  );
}
