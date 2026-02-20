import { auth } from "@/infrastructure/auth/auth.config";
import { SiteHeader } from "@/components/site-header";

export default async function PublicMomentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="min-h-screen">
      <SiteHeader user={session?.user} />
      {children}
    </div>
  );
}
