"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Github } from "lucide-react";
import { signInWithGitHub, signInWithGoogle, signInWithEmail } from "@/app/actions/auth";

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

type SignInFormProps = {
  callbackUrl?: string;
};

export function SignInForm({ callbackUrl }: SignInFormProps) {
  const t = useTranslations("Auth");

  return (
    <div className="space-y-4">
      <form action={signInWithGoogle}>
        {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
        <Button variant="outline" className="w-full" type="submit">
          <GoogleIcon />
          {t("signIn.google")}
        </Button>
      </form>
      <form action={signInWithGitHub}>
        {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
        <Button variant="outline" className="w-full" type="submit">
          <Github className="size-4" />
          {t("signIn.github")}
        </Button>
      </form>

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
        <Button className="w-full" type="submit">
          {t("signIn.magicLink")}
        </Button>
      </form>
    </div>
  );
}
