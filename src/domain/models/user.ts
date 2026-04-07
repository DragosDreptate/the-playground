export type UserRole = "USER" | "ADMIN";

/** Sous-ensemble minimal d'un User pour l'affichage d'avatar (initiales + gradient ou image). */
export type UserAvatarInfo = {
  firstName: string | null;
  lastName: string | null;
  email: string;
  image: string | null;
};

export type SocialLinks = {
  website: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  githubUrl: string | null;
};

export type PublicUser = {
  publicId: string;
  firstName: string;
  lastName: string;
  image: string | null;
  bio: string | null;
  city: string | null;
  socialLinks: SocialLinks;
  memberSince: Date;
  hostedMomentsCount: number;
};

export type PublicCircleMembership = {
  circleSlug: string;
  circleName: string;
  circleCover: string | null;
  role: "HOST" | "PLAYER";
};

export type PublicMomentRegistration = {
  momentSlug: string;
  momentTitle: string;
  momentDate: Date;
  circleName: string;
};

export type DashboardMode = "PARTICIPANT" | "ORGANIZER";

export type NotificationPreferences = {
  notifyNewRegistration: boolean;
  notifyNewComment: boolean;
  notifyNewMomentInCircle: boolean;
};

export type User = {
  id: string;
  email: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
  emailVerified: Date | null;
  onboardingCompleted: boolean;
  role: UserRole;
  notifyNewRegistration: boolean;
  notifyNewComment: boolean;
  notifyNewMomentInCircle: boolean;
  bio: string | null;
  city: string | null;
  website: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  githubUrl: string | null;
  dashboardMode: DashboardMode | null;
  publicId: string | null;
  createdAt: Date;
  updatedAt: Date;
};
