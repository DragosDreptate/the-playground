import type { UserAvatarInfo } from "@/domain/models/user";

export type CircleVisibility = "PUBLIC" | "PRIVATE";

export type CoverImageAttribution = {
  name: string;
  url: string;
};

export type CircleMemberRole = "HOST" | "CO_HOST" | "PLAYER";

export type MembershipStatus = "PENDING" | "ACTIVE";

export function isOrganizerRole(role: CircleMemberRole): boolean {
  return role === "HOST" || role === "CO_HOST";
}

export function isActiveOrganizer(
  membership: Pick<CircleMembership, "role" | "status"> | null | undefined
): boolean {
  if (!membership) return false;
  return membership.status === "ACTIVE" && isOrganizerRole(membership.role);
}

export type CircleCategory =
  | "TECH"
  | "DESIGN"
  | "BUSINESS"
  | "SPORT_WELLNESS"
  | "ART_CULTURE"
  | "SCIENCE_EDUCATION"
  | "SOCIAL"
  | "OTHER";

export type Circle = {
  id: string;
  slug: string;
  name: string;
  description: string;
  logo: string | null;
  coverImage: string | null;
  coverImageAttribution: CoverImageAttribution | null;
  visibility: CircleVisibility;
  category: CircleCategory | null;
  customCategory: string | null;
  city: string | null;
  website: string | null;
  stripeConnectAccountId: string | null;
  requiresApproval: boolean;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CircleMembership = {
  id: string;
  userId: string;
  circleId: string;
  role: CircleMemberRole;
  status: MembershipStatus;
  joinedAt: Date;
};

export type CircleWithRole = Circle & {
  memberRole: CircleMemberRole;
};

export type CircleMemberWithUser = CircleMembership & {
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    image: string | null;
    publicId: string | null;
  };
};

export type DashboardCircleMember = { user: UserAvatarInfo };

export type DashboardCircle = CircleWithRole & {
  membershipStatus: MembershipStatus;
  memberCount: number;
  upcomingMomentCount: number;
  topMembers: DashboardCircleMember[];
  nextMoment: { title: string; startsAt: Date } | null;
};
