import {
  BarChart3,
  Users,
  CircleDot,
  CalendarDays,
  Compass,
  TicketCheck,
  MessageSquare,
  TrendingUp,
  UserPlus,
} from "lucide-react";

export const adminNavItems = [
  { key: "dashboard", href: "/admin", icon: BarChart3 },
  { key: "users", href: "/admin/users", icon: Users },
  { key: "circles", href: "/admin/circles", icon: CircleDot },
  { key: "moments", href: "/admin/moments", icon: CalendarDays },
  { key: "explorer", href: "/admin/explorer", icon: Compass },
] as const;

export const adminInsightItems = [
  { key: "insightRegistrations", href: "/admin/insights/registrations", icon: TicketCheck },
  { key: "insightFollowers", href: "/admin/insights/followers", icon: UserPlus },
  { key: "insightComments", href: "/admin/insights/comments", icon: MessageSquare },
  { key: "insightActivation", href: "/admin/insights/activation", icon: TrendingUp },
] as const;

export function isAdminPathActive(cleanPath: string, href: string): boolean {
  if (href === "/admin") return cleanPath === "/admin";
  return cleanPath.startsWith(href);
}
