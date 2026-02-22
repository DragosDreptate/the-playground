import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export async function SiteFooter() {
  const t = await getTranslations("Footer");

  return (
    <footer className="border-t border-border/40">
      <div className="mx-auto flex min-h-14 max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3">
        {/* Gauche : logo + copyright */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="flex size-5 items-center justify-center rounded-[4px] bg-gradient-to-br from-pink-500 to-violet-500">
            <svg width="8" height="10" viewBox="0 0 10 12" fill="none" className="ml-px">
              <polygon points="0,0 0,12 10,6" fill="white" />
            </svg>
          </div>
          <span className="text-sm font-medium">The Playground</span>
          <span className="text-muted-foreground text-xs">{t("brand.copyright")}</span>
        </Link>

        {/* Droite : liens */}
        <nav className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
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
