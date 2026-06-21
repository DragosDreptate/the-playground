"use client";

import { type ReactNode, useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useFormStatus } from "react-dom";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Github, Loader2, Mail } from "lucide-react";
import {
  signInWithGitHub,
  signInWithGoogle,
  signInWithLinkedIn,
  signInWithEmail,
  type OAuthProvider,
  type SignInWithEmailState,
} from "@/app/actions/auth";
import { isInAppBrowser, isLinkedInInAppBrowser } from "@/lib/detect-webview";

type SignInProvider = OAuthProvider | "email";

// Capture l'intention de connexion à la soumission du formulaire (donc après
// la validation native du champ email pour le magic link), juste avant la
// redirection OAuth. Permet de mesurer le taux clic → connexion aboutie,
// notamment la déperdition après le départ vers le fournisseur OAuth.
function trackProviderClick(provider: SignInProvider, callbackUrl?: string) {
  posthog.capture("sign_in_provider_clicked", {
    provider,
    // Pathname seul : la query string du callbackUrl peut transporter du PII.
    callback_path: callbackUrl?.split("?")[0],
  });
}

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

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#0A66C2"
        d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.8 0 0 .78 0 1.74v20.52C0 23.22.8 24 1.77 24h20.45c.97 0 1.78-.78 1.78-1.74V1.74C24 .78 23.19 0 22.22 0z"
      />
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

function DisabledOAuthButton({ label, icon }: { label: string; icon: ReactNode }) {
  return (
    <Button variant="outline" className="w-full opacity-50 cursor-not-allowed" type="button" disabled>
      {icon}
      {label}
    </Button>
  );
}

function OAuthForm({
  action,
  provider,
  label,
  icon,
  callbackUrl,
}: {
  action: (formData: FormData) => void | Promise<void>;
  provider: SignInProvider;
  label: string;
  icon: ReactNode;
  callbackUrl?: string;
}) {
  return (
    <form action={action} onSubmit={() => trackProviderClick(provider, callbackUrl)}>
      {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
      <SubmitButton label={label} icon={icon} variant="outline" />
    </form>
  );
}

type SignInFormProps = {
  callbackUrl?: string;
  error?: string;
};

export function SignInForm({ callbackUrl, error }: SignInFormProps) {
  const t = useTranslations("Auth");
  const [webview, setWebview] = useState(false);
  const [linkedinWebview, setLinkedinWebview] = useState(false);
  const [emailState, emailAction] = useActionState<SignInWithEmailState, FormData>(
    signInWithEmail,
    null
  );

  useEffect(() => {
    setWebview(isInAppBrowser());
    setLinkedinWebview(isLinkedInInAppBrowser());
  }, []);

  return (
    <div className="space-y-4">
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {t(`errors.${error}`, { defaultValue: t("errors.Default") })}
          </div>
        )}

        {webview && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <Mail className="size-4 shrink-0 mt-0.5 text-primary" />
              <p>
                {linkedinWebview
                  ? t("signIn.webviewNoticeLinkedin")
                  : t("signIn.webviewNotice")}
              </p>
            </div>
          </div>
        )}

        {linkedinWebview ? (
          // Webview LinkedIn : l'OAuth LinkedIn y aboutit, on le propose en
          // premier et en un tap. Google/GitHub restent bloqués (webview tierce).
          <>
            <OAuthForm
              action={signInWithLinkedIn}
              provider="linkedin"
              label={t("signIn.linkedin")}
              icon={<LinkedInIcon />}
              callbackUrl={callbackUrl}
            />
            <DisabledOAuthButton label={t("signIn.google")} icon={<GoogleIcon />} />
            <DisabledOAuthButton label={t("signIn.github")} icon={<Github className="size-4" />} />
          </>
        ) : webview ? (
          <>
            <DisabledOAuthButton label={t("signIn.google")} icon={<GoogleIcon />} />
            <DisabledOAuthButton label={t("signIn.linkedin")} icon={<LinkedInIcon />} />
            <DisabledOAuthButton label={t("signIn.github")} icon={<Github className="size-4" />} />
          </>
        ) : (
          <>
            <OAuthForm
              action={signInWithGoogle}
              provider="google"
              label={t("signIn.google")}
              icon={<GoogleIcon />}
              callbackUrl={callbackUrl}
            />
            <OAuthForm
              action={signInWithLinkedIn}
              provider="linkedin"
              label={t("signIn.linkedin")}
              icon={<LinkedInIcon />}
              callbackUrl={callbackUrl}
            />
            <OAuthForm
              action={signInWithGitHub}
              provider="github"
              label={t("signIn.github")}
              icon={<Github className="size-4" />}
              callbackUrl={callbackUrl}
            />
          </>
        )}

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-muted-foreground text-xs uppercase">{t("signIn.or")}</span>
          <Separator className="flex-1" />
        </div>

        <form
          action={emailAction}
          onSubmit={() => trackProviderClick("email", callbackUrl)}
          className="space-y-3"
        >
          {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
          <Input
            name="email"
            type="email"
            placeholder={t("signIn.emailPlaceholder")}
            aria-invalid={
              emailState?.error === "INVALID_EMAIL" ||
              emailState?.error === "DISPOSABLE_EMAIL" ||
              undefined
            }
            aria-describedby={emailState?.error ? "email-error" : undefined}
            required
          />
          {emailState?.error && (
            <p id="email-error" className="text-sm text-destructive">
              {t(
                {
                  INVALID_EMAIL: "signIn.invalidEmail",
                  DISPOSABLE_EMAIL: "signIn.disposableEmail",
                  SEND_FAILED: "signIn.sendFailed",
                  BOT_DETECTED: "signIn.botDetected",
                }[emailState.error]
              )}
            </p>
          )}
          <SubmitButton label={t("signIn.magicLink")} />
        </form>
    </div>
  );
}
