import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/auth-cache";

export default async function LabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCachedSession();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  return <>{children}</>;
}
