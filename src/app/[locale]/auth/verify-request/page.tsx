import { useTranslations } from "next-intl";

export default function VerifyRequestPage() {
  const t = useTranslations("Auth");

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4 text-center">
        <h1 className="text-2xl font-bold tracking-tight">{t("verifyRequest.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("verifyRequest.description")}</p>
      </div>
    </div>
  );
}
