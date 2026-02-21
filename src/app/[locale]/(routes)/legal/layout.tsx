import { auth } from "@/infrastructure/auth/auth.config";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default async function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader user={session?.user} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <article className="prose dark:prose-invert max-w-none">
          {children}
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
