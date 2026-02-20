export type CircleVisibility = "PUBLIC" | "PRIVATE";

export type CircleMemberRole = "HOST" | "PLAYER";

export type Circle = {
  id: string;
  slug: string;
  name: string;
  description: string;
  logo: string | null;
  visibility: CircleVisibility;
  stripeConnectAccountId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CircleMembership = {
  id: string;
  userId: string;
  circleId: string;
  role: CircleMemberRole;
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
  };
};
