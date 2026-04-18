"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { ExternalLink } from "lucide-react";
import { isInAppBrowser } from "@/lib/detect-webview";

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const t = useTranslations("Auth");
  const [webview, setWebview] = useState(false);
  const capturedRef = useRef<string | null>(null);

  useEffect(() => {
    setWebview(isInAppBrowser());
  }, []);

  useEffect(() => {
    if (error && capturedRef.current !== error) {
      capturedRef.current = error;
      Sentry.captureMessage(`auth-error-page: ${error}`, {
        level: "warning",
        tags: { context: "auth", error_code: error },
      });
    }
  }, [error]);

  const errorMessage = error
    ? t(`errors.${error}`, { defaultValue: t("errors.Default") })
    : t("errors.Default");

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4 text-center">
        <h1 className="text-2xl font-bold tracking-tight">{t("error.title")}</h1>
        <p className="text-muted-foreground text-sm">{errorMessage}</p>

        {webview && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-muted-foreground text-left space-y-2">
            <p>{t("error.webviewExplanation")}</p>
            <p className="font-medium text-foreground">{t("error.webviewAction")}</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Button asChild>
            <Link href="/auth/sign-in">{t("error.backToSignIn")}</Link>
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
