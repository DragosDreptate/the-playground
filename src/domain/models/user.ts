import type { CircleMemberRole } from "@/domain/models/circle";

export type UserRole = "USER" | "ADMIN";

/**
 * Sous-ensemble minimal d'un User pour l'affichage d'avatar (initiales + dégradé ou
 * image). NE porte PAS l'email : le dégradé de fallback est **pré-calculé côté serveur**
 * (`gradient`, via `getMomentGradient(publicId ?? id)`) pour ne jamais sérialiser de PII
 * vers le client sur les surfaces publiques (Explorer, cartes, embed). Cf. SEC-10.
 */
export type UserAvatarInfo = {
  firstName: string | null;
  lastName: string | null;
  image: string | null;
  gradient: string;
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
  role: CircleMemberRole;
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
  welcomeEmailSentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
