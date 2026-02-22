"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { signInWithGitHub, signInWithGoogle, signInWithEmail } from "@/app/actions/auth";

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
          {t("signIn.google")}
        </Button>
      </form>
      <form action={signInWithGitHub}>
        {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
        <Button variant="outline" className="w-full" type="submit">
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
