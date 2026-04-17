import { getCachedDashboardCircles } from "@/lib/dashboard-cache";
import { HostOnlyFilter } from "./host-only-filter";

export async function DashboardFilterBar({
  hostOnly,
  activeTab,
  userId,
}: {
  hostOnly: boolean;
  activeTab: "moments" | "circles";
  userId: string;
}) {
  const circles = await getCachedDashboardCircles(userId);
  const isOrganizer = circles.some((c) => c.memberRole === "HOST");

  if (!isOrganizer) return null;

  return <HostOnlyFilter active={hostOnly} activeTab={activeTab} />;
}
