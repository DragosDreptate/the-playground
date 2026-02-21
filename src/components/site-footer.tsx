import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export async function SiteFooter() {
  const t = await getTranslations("Footer");

  return (
    <footer className="border-t bg-muted/30 px-4 py-12">
      <div className="mx-auto max-w-5xl">
        {/* 3 columns */}
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-[5px] bg-gradient-to-br from-pink-500 to-violet-500">
                <svg
                  width="10"
                  height="12"
                  viewBox="0 0 10 12"
                  fill="none"
                  className="ml-px"
                >
                  <polygon points="0,0 0,12 10,6" fill="white" />
                </svg>
              </div>
              <span className="text-lg font-semibold">The Playground</span>
            </Link>
            <p className="text-muted-foreground mt-3 text-sm">
              {t("brand.tagline")}
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-sm font-semibold">{t("product.title")}</h3>
            <ul className="text-muted-foreground mt-3 space-y-2 text-sm">
              <li>
                <Link
                  href="/explorer"
                  className="hover:text-foreground transition-colors"
                >
                  {t("product.explore")}
                </Link>
              </li>
              <li>
                <Link
                  href="/#how-it-works"
                  className="hover:text-foreground transition-colors"
                >
                  {t("product.howItWorks")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold">{t("legal.title")}</h3>
            <ul className="text-muted-foreground mt-3 space-y-2 text-sm">
              <li>
                <Link
                  href="/legal/mentions-legales"
                  className="hover:text-foreground transition-colors"
                >
                  {t("legal.legalNotice")}
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/confidentialite"
                  className="hover:text-foreground transition-colors"
                >
                  {t("legal.privacy")}
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/cgu"
                  className="hover:text-foreground transition-colors"
                >
                  {t("legal.terms")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Separator + copyright */}
        <div className="text-muted-foreground mt-10 border-t pt-6 text-center text-xs">
          {t("brand.copyright")}
        </div>
      </div>
    </footer>
  );
}
