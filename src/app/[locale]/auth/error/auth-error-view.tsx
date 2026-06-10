"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { ExternalLink } from "lucide-react";
import { isInAppBrowser } from "@/lib/detect-webview";
import { AUTH_ERROR_VERIFICATION } from "@/lib/auth/error-kinds";

function AuthHint({ explanation, action }: { explanation: string; action: string }) {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-muted-foreground text-left space-y-2">
      <p>{explanation}</p>
      <p className="font-medium text-foreground">{action}</p>
    </div>
  );
}

export function AuthErrorView({ error }: { error: string | null }) {
  const t = useTranslations("Auth");
  const [webview, setWebview] = useState(false);

  useEffect(() => {
    setWebview(isInAppBrowser());
  }, []);

  const errorMessage = error
    ? t(`errors.${error}`, { defaultValue: t("errors.Default") })
    : t("errors.Default");

  const isVerification = error === AUTH_ERROR_VERIFICATION;
  const ctaLabel = isVerification ? t("error.requestNewLink") : t("error.backToSignIn");

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4 text-center">
        <h1 className="text-2xl font-bold tracking-tight">{t("error.title")}</h1>
        <p className="text-muted-foreground text-sm">{errorMessage}</p>

        {isVerification && (
          <AuthHint
            explanation={t("error.verificationExplanation")}
            action={t("error.verificationAction")}
          />
        )}

        {webview && (
          <AuthHint
            explanation={t("error.webviewExplanation")}
            action={t("error.webviewAction")}
          />
        )}

        <div className="flex flex-col gap-2">
          <Button asChild>
            <Link href="/auth/sign-in">{ctaLabel}</Link>
          </Button>
          {webview && (
            <Button variant="outline" asChild>
              <a
                href={typeof window !== "undefined" ? window.location.origin : "https://the-playground.fr"}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="size-4" />
                {t("error.openInBrowser")}
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
