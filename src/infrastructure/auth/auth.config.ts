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
  callbacks: {
    async signIn({ user, profile }) {
      if (user.id) {
        // profile.image = profil normalisé Auth.js
        // profile.picture = champ brut Google (OIDC)
        // profile.avatar_url = champ brut GitHub
        const rawProfile = profile as Record<string, unknown>;
        const imageUrl =
          (typeof rawProfile?.image === "string" ? rawProfile.image : null) ??
          (typeof rawProfile?.picture === "string" ? rawProfile.picture : null) ??
          (typeof rawProfile?.avatar_url === "string" ? rawProfile.avatar_url : null);

        if (imageUrl) {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { image: true },
          });
          // Ne pas écraser un avatar uploadé manuellement par l'utilisateur
          if (!isUploadedUrl(dbUser?.image)) {
            await prisma.user.update({
              where: { id: user.id },
              data: { image: imageUrl },
            });
          }
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
