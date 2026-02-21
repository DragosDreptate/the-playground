import { auth } from "@/infrastructure/auth/auth.config";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default async function PublicMomentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader user={session?.user} />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
