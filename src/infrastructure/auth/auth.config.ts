import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import ResendProvider from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/infrastructure/db/prisma";
import { Resend } from "resend";
import { MagicLinkEmail } from "@/infrastructure/services/email/templates/magic-link";
import { isUploadedUrl } from "@/lib/blob";
import { captureServerEvent } from "@/lib/posthog-server";

export const { handlers, auth, signIn, signOut, unstable_update: update } = NextAuth({
  debug: process.env.NODE_ENV !== "production",
  // Nécessaire sur Vercel (preview + prod) : fait confiance au header X-Forwarded-Host
  // du proxy Vercel, ce qui évite l'erreur "UntrustedHost" sur les URLs preview dynamiques.
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  // JWT : session encodée dans un cookie signé — élimine Session.findUnique (~300ms)
  // sur chaque requête (strategy "database" par défaut avec PrismaAdapter).
  session: { strategy: "jwt" },
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
      // Synchro image OAuth — ne doit jamais bloquer le sign-in
      try {
        if (user.id && profile) {
          // profile.image = profil normalisé Auth.js
          // profile.picture = champ brut Google (OIDC)
          // profile.avatar_url = champ brut GitHub
          const rawProfile = profile as Record<string, unknown>;
          const imageUrl =
            (typeof rawProfile.image === "string" ? rawProfile.image : null) ??
            (typeof rawProfile.picture === "string" ? rawProfile.picture : null) ??
            (typeof rawProfile.avatar_url === "string" ? rawProfile.avatar_url : null);

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
      } catch (err) {
        console.error("[AUTH] OAuth image sync failed (non-blocking):", err);
      }

      // Tracking nouvel utilisateur — createdAt dans les 30 dernières secondes
      try {
        if (user.id) {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { createdAt: true },
          });
          if (dbUser) {
            const ageMs = Date.now() - dbUser.createdAt.getTime();
            if (ageMs < 30_000) {
              await captureServerEvent(user.id, "user_signed_up", {
                provider: profile ? "oauth" : "email",
              });
            }
          }
        }
      } catch (err) {
        console.error("[AUTH] PostHog user_signed_up tracking failed (non-blocking):", err);
      }

      return true;
    },

    // Encode les champs custom dans le JWT au sign-in,
    // puis les relit depuis le token sur chaque requête (pas de DB).
    async jwt({ token, user, trigger, session: sessionUpdate }) {
      // Au sign-in : peupler le token avec les données DB de l'utilisateur
      if (user) {
        token.id = user.id;
        const dbUser = user as unknown as {
          onboardingCompleted: boolean;
          role: "USER" | "ADMIN";
          dashboardMode: "PARTICIPANT" | "ORGANIZER" | null;
        };
        token.onboardingCompleted = dbUser.onboardingCompleted;
        token.role = dbUser.role;
        token.dashboardMode = dbUser.dashboardMode ?? null;
      }
      // Sur appel update() depuis une Server Action : appliquer les nouvelles valeurs
      // sessionUpdate suit la structure Session (champs sous .user)
      if (trigger === "update" && sessionUpdate?.user) {
        const u = sessionUpdate.user as Partial<{
          onboardingCompleted: boolean;
          dashboardMode: "PARTICIPANT" | "ORGANIZER" | null;
        }>;
        if (u.onboardingCompleted !== undefined) token.onboardingCompleted = u.onboardingCompleted;
        if (u.dashboardMode !== undefined) token.dashboardMode = u.dashboardMode;
      }
      return token;
    },

    // Expose les champs du JWT dans la session (zéro DB lookup)
    session({ session, token }) {
      session.user.id = token.sub ?? (token.id as string);
      session.user.onboardingCompleted = token.onboardingCompleted as boolean;
      session.user.role = token.role as "USER" | "ADMIN";
      session.user.dashboardMode = token.dashboardMode as "PARTICIPANT" | "ORGANIZER" | null;
      return session;
    },
  },
});
