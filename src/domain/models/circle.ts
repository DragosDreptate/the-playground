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

/**
 * Garde les actions réservées au propriétaire de la Communauté (delete, promote,
 * demote, Stripe Connect, leaveCircle guard). Un CO_HOST ne passe pas ce check.
 */
export function isActivePrimaryHost(
  membership: Pick<CircleMembership, "role" | "status"> | null | undefined
): boolean {
  if (!membership) return false;
  return membership.status === "ACTIVE" && membership.role === "HOST";
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
    website?: string | null;
    linkedinUrl?: string | null;
    twitterUrl?: string | null;
    githubUrl?: string | null;
  };
};

/**
 * Retire l'email d'un membre avant sérialisation vers un viewer non-Organisateur
 * (HOST/CO_HOST). L'email est blanchi (`""`) ; les liens sociaux restent (publics).
 * Sans cette redaction, la liste des membres d'une Communauté fuite l'email de tous
 * les membres à n'importe quel compte connecté (jumeau de la fuite inscrits, RT-01).
 */
export function redactCircleMemberForNonHost(
  member: CircleMemberWithUser,
): CircleMemberWithUser {
  return { ...member, user: { ...member.user, email: "" } };
}

/**
 * Applique la règle de redaction à une liste de membres selon le rôle du viewer :
 * l'Organisateur reçoit tout, les autres reçoivent des membres réduits. Source unique
 * partagée par le usecase de pagination et les pages serveur.
 */
export function visibleMembersFor(
  isOrganizer: boolean,
  members: CircleMemberWithUser[],
): CircleMemberWithUser[] {
  return isOrganizer ? members : members.map(redactCircleMemberForNonHost);
}

export type DashboardCircleMember = { user: UserAvatarInfo };

export type DashboardCircle = CircleWithRole & {
  membershipStatus: MembershipStatus;
  memberCount: number;
  upcomingMomentCount: number;
  topMembers: DashboardCircleMember[];
  nextMoment: { title: string; startsAt: Date } | null;
};
