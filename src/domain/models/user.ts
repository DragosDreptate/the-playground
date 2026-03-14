export type UserRole = "USER" | "ADMIN";

export type PublicUser = {
  publicId: string;
  firstName: string;
  lastName: string;
  image: string | null;
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
  dashboardMode: DashboardMode | null;
  publicId: string | null;
  createdAt: Date;
  updatedAt: Date;
};
