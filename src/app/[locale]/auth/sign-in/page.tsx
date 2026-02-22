import { redirect } from "next/navigation";
import { useTranslations } from "next-intl";
import { auth } from "@/infrastructure/auth/auth.config";
import { SignInForm } from "@/components/auth/sign-in-form";
import { safeCallbackUrl } from "@/lib/url";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(params.callbackUrl);

  if (session) {
    redirect(callbackUrl ?? "/dashboard");
  }

  return <SignInContent callbackUrl={callbackUrl} />;
}

function SignInContent({ callbackUrl }: { callbackUrl?: string }) {
  const t = useTranslations("Auth");

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">{t("signIn.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("signIn.subtitle")}</p>
        </div>
        <SignInForm callbackUrl={callbackUrl} />
      </div>
    </div>
  );
}
