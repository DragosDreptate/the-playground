import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import ResendProvider from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/infrastructure/db/prisma";
import { Resend } from "resend";
import { MagicLinkEmail } from "@/infrastructure/services/email/templates/magic-link";
import { isUploadedUrl } from "@/lib/blob";

export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: process.env.NODE_ENV !== "production",
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub,
    Google,
    ResendProvider({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.EMAIL_FROM ?? "onboarding@resend.dev",
      async sendVerificationRequest({ identifier, url }) {
        const resend = new Resend(process.env.AUTH_RESEND_KEY);
        const from = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

        const { error } = await resend.emails.send({
          from,
          to: identifier,
          subject: "Votre lien de connexion — The Playground",
          react: MagicLinkEmail({ url }),
        });

        if (error) {
          throw new Error(`[AUTH] Magic link email failed: ${error.message}`);
        }
      },
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
  events: {
    async linkAccount({ user, profile }) {
      if (profile.image && user.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { image: true },
        });
        // Ne pas écraser un avatar uploadé manuellement par l'utilisateur
        if (!isUploadedUrl(dbUser?.image)) {
          await prisma.user.update({
            where: { id: user.id },
            data: { image: profile.image },
          });
        }
      }
    },
  },
  callbacks: {
    async signIn({ user, profile }) {
      if (profile?.image && user.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { image: true },
        });
        // Ne pas écraser un avatar uploadé manuellement. Mettre à jour uniquement si
        // l'utilisateur n'a pas encore d'avatar ou si son avatar OAuth a changé.
        if (!isUploadedUrl(dbUser?.image) && dbUser?.image !== profile.image) {
          await prisma.user.update({
            where: { id: user.id },
            data: { image: profile.image },
          });
        }
      }
      return true;
    },
    session({ session, user }) {
      session.user.id = user.id;
      const dbUser = user as unknown as { onboardingCompleted: boolean; role: "USER" | "ADMIN" };
      session.user.onboardingCompleted = dbUser.onboardingCompleted;
      session.user.role = dbUser.role;
      return session;
    },
  },
});
