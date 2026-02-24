export type CircleVisibility = "PUBLIC" | "PRIVATE";

export type CoverImageAttribution = {
  name: string;
  url: string;
};

export type CircleMemberRole = "HOST" | "PLAYER";

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
  city: string | null;
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

export type CircleFollow = {
  id: string;
  userId: string;
  circleId: string;
  createdAt: Date;
};
