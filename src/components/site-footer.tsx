import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export async function SiteFooter() {
  const t = await getTranslations("Footer");

  return (
    <footer className="border-t border-border/40">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:py-3">
        {/* Logo + copyright */}
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="flex size-5 items-center justify-center rounded-[4px] bg-gradient-to-br from-pink-500 to-violet-500">
              <svg width="8" height="10" viewBox="0 0 10 12" fill="none" className="ml-px">
                <polygon points="0,0 0,12 10,6" fill="white" />
              </svg>
            </div>
            <span className="text-sm font-medium">The Playground</span>
          </Link>
          <span className="text-muted-foreground text-xs">{t("brand.copyright")}</span>
        </div>

        {/* Liens */}
        <nav className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <Link href="/about" className="hover:text-foreground transition-colors">
            {t("product.about")}
          </Link>
          <Link href="/changelog" className="hover:text-foreground transition-colors">
            {t("product.changelog")}
          </Link>
          <Link href="/legal/mentions-legales" className="hover:text-foreground transition-colors">
            {t("legal.legalNotice")}
          </Link>
          <Link href="/legal/confidentialite" className="hover:text-foreground transition-colors">
            {t("legal.privacy")}
          </Link>
          <Link href="/legal/cgu" className="hover:text-foreground transition-colors">
            {t("legal.terms")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
