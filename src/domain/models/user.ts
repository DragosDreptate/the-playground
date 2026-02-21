export type UserRole = "USER" | "ADMIN";

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
  createdAt: Date;
  updatedAt: Date;
};
