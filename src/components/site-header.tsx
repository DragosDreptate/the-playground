import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { getTranslations } from "next-intl/server";

type SiteHeaderProps = {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
};

export async function SiteHeader({ user }: SiteHeaderProps) {
  const t = await getTranslations("Auth");

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href={user ? "/dashboard" : "/"} className="text-lg font-semibold">
          The Playground
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {user ? (
            <UserMenu user={user} />
          ) : (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/auth/sign-in">{t("signIn.title")}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
