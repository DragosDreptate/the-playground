import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth.config";

export default async function LabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  return <>{children}</>;
}
