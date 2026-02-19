import { redirect } from "next/navigation";
import { useTranslations } from "next-intl";
import { auth } from "@/infrastructure/auth/auth.config";
import { SignInForm } from "@/components/auth/sign-in-form";

export default async function SignInPage() {
  const session = await auth();

  if (session) {
    redirect("/");
  }

  return <SignInContent />;
}

function SignInContent() {
  const t = useTranslations("Auth");

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">{t("signIn.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("signIn.subtitle")}</p>
        </div>
        <SignInForm />
      </div>
    </div>
  );
}
