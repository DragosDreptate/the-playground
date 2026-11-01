import { redirect } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { getLocale } from "next-intl/server";
import { getCachedSession } from "@/lib/auth-cache";
import { prismaUserRepository } from "@/infrastructure/repositories";
import { rememberPreferredLocaleIfMissing } from "@/domain/usecases/set-preferred-locale";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCachedSession();

  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  // Comptes connectés avant que la langue soit mémorisée : on la capte à la
  // première visite, sans attendre une reconnexion. Une seule écriture par compte.
  // Best-effort : un échec d'écriture ne doit jamais casser l'espace connecté.
  if (session.user.preferredLocale === null) {
    try {
      await rememberPreferredLocaleIfMissing(session.user.id, await getLocale(), {
        userRepository: prismaUserRepository,
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { context: "preferred_locale_backfill" } });
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
