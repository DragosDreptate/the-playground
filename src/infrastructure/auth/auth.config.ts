import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/infrastructure/db/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: process.env.NODE_ENV !== "production",
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub,
    Google,
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.AUTH_EMAIL_FROM ?? "onboarding@resend.dev",
    }),
  ],
  pages: {
    signIn: "/auth/sign-in",
    verifyRequest: "/auth/verify-request",
    error: "/auth/error",
  },
  logger: {
    error(error) {
      console.error("[AUTH ERROR]", error);
    },
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      session.user.onboardingCompleted = (user as unknown as { onboardingCompleted: boolean }).onboardingCompleted;
      return session;
    },
  },
});
