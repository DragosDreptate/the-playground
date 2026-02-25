export type UserRole = "USER" | "ADMIN";

export type NotificationPreferences = {
  notifyNewRegistration: boolean;
  notifyNewComment: boolean;
  notifyNewFollower: boolean;
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
  notifyNewFollower: boolean;
  notifyNewMomentInCircle: boolean;
  createdAt: Date;
  updatedAt: Date;
};
