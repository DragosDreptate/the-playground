import * as Sentry from "@sentry/nextjs";
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import ResendProvider from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/infrastructure/db/prisma";
import { createSafeResend } from "@/lib/email/safe-resend";
import { MagicLinkEmail } from "@/infrastructure/services/email/templates/magic-link";
import { isUploadedUrl } from "@/lib/blob";
import { prismaUserRepository } from "@/infrastructure/repositories/prisma-user-repository";
import { detectLocaleForMagicLink } from "@/lib/auth/magic-link-url";
import { classifyAuthError } from "@/lib/auth/error-kinds";
import { getRequestObservability } from "@/lib/auth/request-observability";
import { captureServerEvent } from "@/lib/posthog-server";
import { createReusableVerificationToken } from "@/infrastructure/auth/reusable-verification-token";

// Validité du magic link. On le rend volontairement court (vs 24h par défaut
// Auth.js) parce que le token est désormais réutilisable pendant cette fenêtre,
// pour absorber le prefetch des scanners email corporate (Defender, Mimecast…)
// sans bloquer l'utilisateur humain qui cliquera ensuite. Cf. spec
// /spec/magic-link-reusable-token.md.
const MAGIC_LINK_MAX_AGE_SECONDS = 60 * 15;

// Fenêtre pendant laquelle un User est considéré "nouveau" dans le session
// callback. Dérivée de MAGIC_LINK_MAX_AGE_SECONDS : si un scanner email crée
// le User à T+0 et que l'humain clique près de l'expiration, il faut que
// isNewUser reste vrai jusqu'à la fin de la fenêtre de validité du token.
const NEW_USER_WINDOW_MS = MAGIC_LINK_MAX_AGE_SECONDS * 1000;

// Adapter custom : on garde toutes les méthodes standard du PrismaAdapter
// (createUser, getUserByEmail, etc.) et on override uniquement
// useVerificationToken pour rendre le magic link réutilisable pendant sa
// fenêtre de validité (cf. createReusableVerificationToken).
const basePrismaAdapter = PrismaAdapter(prisma);
const adapter: typeof basePrismaAdapter = {
  ...basePrismaAdapter,
  useVerificationToken: createReusableVerificationToken(prisma),
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: process.env.NODE_ENV !== "production",
  // Nécessaire sur Vercel (preview + prod) : fait confiance au header X-Forwarded-Host
  // du proxy Vercel, ce qui évite l'erreur "UntrustedHost" sur les URLs preview dynamiques.
  trustHost: true,
  adapter,
  providers: [
    // allowDangerousEmailAccountLinking : si un User existe déjà avec le même email
    // (créé via magic link ou autre provider), Auth.js linke automatiquement le
    // compte OAuth au lieu de jeter `OAuthAccountNotLinked`. Sans cette flag,
    // l'utilisateur reste bloqué silencieusement sur /auth/sign-in?error=... sans
    // feedback. Risque : un attaquant qui contrôlerait un compte OAuth avec un
    // email primaire correspondant à un User existant pourrait usurper. Mitigé
    // pour Google (email_verified=true requis via OIDC) et pour GitHub (verif
    // email obligatoire avant de marquer une adresse comme primary).
    GitHub({ allowDangerousEmailAccountLinking: true }),
    Google({ allowDangerousEmailAccountLinking: true }),
    ResendProvider({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.EMAIL_FROM ?? "onboarding@resend.dev",
      maxAge: MAGIC_LINK_MAX_AGE_SECONDS,
      async sendVerificationRequest({ identifier, url, request }) {
        const resend = createSafeResend(process.env.AUTH_RESEND_KEY);
        const from = process.env.EMAIL_FROM ?? "onboarding@resend.dev";
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

        // La locale du mail est lue depuis le `callbackUrl` de l'URL Auth.js
        // en priorité (parcours produit), avec repli cookie/header. C'est plus
        // fiable que le seul cookie NEXT_LOCALE qui n'est pas toujours set par
        // next-intl quand on est sur la locale par défaut.
        const locale = detectLocaleForMagicLink(url, request);
        const t = await getTranslations({ locale, namespace: "Email.magicLink" });

        const { error } = await resend.emails.send({
          from,
          to: identifier,
          subject: t("subject"),
          react: MagicLinkEmail({
            url,
            baseUrl,
            strings: {
              preview: t("preview"),
              heading: t("heading"),
              bodyText: t("bodyText"),
              ctaLabel: t("ctaLabel"),
              expiryText: t("expiryText"),
              securityText: t("securityText"),
              footer: t("footer"),
            },
          }),
        });

        if (error) {
          Sentry.captureException(error, {
            tags: { context: "magic_link" },
            extra: {
              email_domain: identifier.split("@")[1] ?? "unknown",
              resend_message: error.message,
              resend_name: error.name,
            },
          });
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
    async error(error) {
      console.error("[AUTH ERROR]", error);
      const code = error?.name ?? "Unknown";
      const kind = classifyAuthError(code);
      // Les erreurs "attendues dans le flow utilisateur" (token expiré,
      // prefetch scanner, refus OAuth) restent capturées mais en niveau
      // warning pour ne pas spammer les alertes high-priority.
      Sentry.captureException(error, {
        level: kind === "expected_user_flow" ? "warning" : "error",
        tags: {
          context: "auth",
          error_code: code,
          auth_error_kind: kind,
        },
        // Le user-agent distingue un token expiré détonné par un scanner
        // email d'un vrai clic humain tardif (incident @interieur.gouv.fr).
        extra: await getRequestObservability(),
      });
    },
    async warn(code) {
      console.warn("[AUTH WARN]", code);
      Sentry.captureMessage(`auth:${code}`, {
        level: "warning",
        tags: {
          context: "auth",
          error_code: code,
          auth_error_kind: classifyAuthError(code),
        },
        extra: await getRequestObservability(),
      });
    },
  },
  events: {
    // Trace serveur de chaque sign-in réussi, avec user-agent : permet de
    // distinguer un clic humain d'une détonation de scanner email (incident
    // @interieur.gouv.fr — Users fantômes créés 6s après l'envoi du lien).
    // Chaque clic sur un magic link réutilisable apparaît ici. Canal PostHog
    // (pas Sentry) : c'est de la télémétrie steady-state, pas une anomalie.
    async signIn({ user, account, isNewUser }) {
      const requestContext = await getRequestObservability();
      void captureServerEvent(user.id ?? user.email ?? "unknown", "auth_sign_in", {
        ...requestContext,
        provider: account?.provider ?? "unknown",
        is_new_user: isNewUser ?? false,
        email_domain: user.email?.split("@")[1] ?? "unknown",
        // Renseigne l'email/nom sur la person dès le serveur : si le client
        // PostHog est bloqué (ad-blocker, ITP), la person reste retrouvable
        // par email au lieu de devenir un profil anonyme introuvable.
        $set: {
          ...(user.email ? { email: user.email } : {}),
          ...(user.name ? { name: user.name } : {}),
        },
      });
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

      // Génération du publicId si absent — non bloquant
      try {
        if (user.id) {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { publicId: true, firstName: true, lastName: true },
          });
          if (dbUser && !dbUser.publicId) {
            await prismaUserRepository.ensurePublicId(
              user.id,
              dbUser.firstName,
              dbUser.lastName
            );
          }
        }
      } catch (err) {
        console.error("[AUTH] publicId generation failed (non-blocking):", err);
        Sentry.captureException(err, { tags: { context: "publicId_generation" } });
      }

      return true;
    },
    session({ session, user }) {
      session.user.id = user.id;
      const dbUser = user as unknown as {
        onboardingCompleted: boolean;
        role: "USER" | "ADMIN";
        dashboardMode: "PARTICIPANT" | "ORGANIZER" | null;
        createdAt: Date;
      };
      session.user.onboardingCompleted = dbUser.onboardingCompleted;
      session.user.role = dbUser.role;
      session.user.dashboardMode = dbUser.dashboardMode ?? null;
      const ageMs = Date.now() - new Date(dbUser.createdAt).getTime();
      session.user.isNewUser = ageMs < NEW_USER_WINDOW_MS;
      return session;
    },
  },
});
