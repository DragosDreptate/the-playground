import { auth } from "@/infrastructure/auth/auth.config";
import { SiteHeader } from "@/components/site-header";

export default async function PublicCircleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="min-h-screen">
      <SiteHeader user={session?.user} />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
