import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

type SearchParams = {
  token?: string;
  email?: string;
  callbackUrl?: string;
};

// Un token consommé ne doit jamais s'afficher depuis un cache CDN.
export const dynamic = "force-dynamic";

export default async function AuthConfirmPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const t = await getTranslations("Auth.confirm");

  if (!params.token || !params.email) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <h1 className="text-2xl font-bold tracking-tight">{t("invalid.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("invalid.description")}</p>
          <Button asChild>
            <Link href="/auth/sign-in">{t("invalid.cta")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Auth.js v5 lit token + email depuis l'URL (pas le body) sur le callback
  // email, même en POST. Les params restent donc en query string.
  const query = new URLSearchParams({ token: params.token, email: params.email });
  if (params.callbackUrl) query.set("callbackUrl", params.callbackUrl);
  const action = `/api/auth/callback/resend?${query.toString()}`;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("reason")}</p>
        </div>

        <form action={action} method="POST">
          <Button type="submit" size="lg" className="w-full">
            {t("submit")}
          </Button>
        </form>
      </div>
    </div>
  );
}
