import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      onboardingCompleted: boolean;
      role: "USER" | "ADMIN";
      dashboardMode: "PARTICIPANT" | "ORGANIZER" | null;
      /** Langue mémorisée pour les emails (null tant qu'aucune n'est connue). */
      preferredLocale: string | null;
      isNewUser?: boolean;
      /** Epoch millis (sérialisable, contrairement à un Date qui devient string en RSC). */
      createdAt: number;
    };
  }
}
