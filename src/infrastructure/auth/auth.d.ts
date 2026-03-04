import "next-auth";
import "next-auth/jwt";

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
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    onboardingCompleted?: boolean;
    role?: "USER" | "ADMIN";
    dashboardMode?: "PARTICIPANT" | "ORGANIZER" | null;
  }
}
