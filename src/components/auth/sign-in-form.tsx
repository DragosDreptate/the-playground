"use client";

import { type ReactNode, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Github, Loader2, Mail } from "lucide-react";
import { signInWithGitHub, signInWithGoogle, signInWithEmail } from "@/app/actions/auth";
import { isInAppBrowser } from "@/lib/detect-webview";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function SubmitButton({
  label,
  icon,
  variant = "default",
}: {
  label: string;
  icon?: ReactNode;
  variant?: "default" | "outline";
}) {
  const { pending } = useFormStatus();
  return (
    <Button variant={variant} className="w-full" type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : icon}
      {label}
    </Button>
  );
}

function DisabledOAuthButton({
  label,
  icon,
  tooltip,
}: {
  label: string;
  icon: ReactNode;
  tooltip: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" className="w-full opacity-50 cursor-not-allowed" type="button" disabled>
          {icon}
          {label}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-64 text-center">
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

type SignInFormProps = {
  callbackUrl?: string;
};

export function SignInForm({ callbackUrl }: SignInFormProps) {
  const t = useTranslations("Auth");
  const [webview, setWebview] = useState(false);

  useEffect(() => {
    setWebview(isInAppBrowser());
  }, []);

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {webview && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <Mail className="size-4 shrink-0 mt-0.5 text-primary" />
              <p>{t("signIn.webviewNotice")}</p>
            </div>
          </div>
        )}

        {webview ? (
          <>
            <DisabledOAuthButton
              label={t("signIn.google")}
              icon={<GoogleIcon />}
              tooltip={t("signIn.webviewTooltip")}
            />
            <DisabledOAuthButton
              label={t("signIn.github")}
              icon={<Github className="size-4" />}
              tooltip={t("signIn.webviewTooltip")}
            />
          </>
        ) : (
          <>
            <form action={signInWithGoogle}>
              {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
              <SubmitButton label={t("signIn.google")} icon={<GoogleIcon />} variant="outline" />
            </form>
            <form action={signInWithGitHub}>
              {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
              <SubmitButton label={t("signIn.github")} icon={<Github className="size-4" />} variant="outline" />
            </form>
          </>
        )}

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-muted-foreground text-xs uppercase">{t("signIn.or")}</span>
          <Separator className="flex-1" />
        </div>

        <form action={signInWithEmail} className="space-y-3">
          {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
          <Input
            name="email"
            type="email"
            placeholder={t("signIn.emailPlaceholder")}
            required
          />
          <SubmitButton label={t("signIn.magicLink")} />
        </form>
      </div>
    </TooltipProvider>
  );
}
