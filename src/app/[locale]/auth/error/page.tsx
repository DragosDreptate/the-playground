"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const t = useTranslations("Auth");

  const errorMessage = error
    ? t(`errors.${error}`, { defaultValue: t("errors.Default") })
    : t("errors.Default");

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4 text-center">
        <h1 className="text-2xl font-bold tracking-tight">{t("error.title")}</h1>
        <p className="text-muted-foreground text-sm">{errorMessage}</p>
        <Button asChild variant="outline">
          <Link href="/auth/sign-in">{t("error.backToSignIn")}</Link>
        </Button>
      </div>
    </div>
  );
}
