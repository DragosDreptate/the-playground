import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth.config";
import { SiteHeader } from "@/components/site-header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  return (
    <div className="min-h-screen">
      <SiteHeader user={session.user} />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
