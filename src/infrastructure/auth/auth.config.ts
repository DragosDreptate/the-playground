import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import ResendProvider from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/infrastructure/db/prisma";
import { Resend } from "resend";
import { MagicLinkEmail } from "@/infrastructure/services/email/templates/magic-link";

// Icône PNG 64×64 (gradient rose→violet, triangle play blanc, coins arrondis)
// Envoyée en pièce jointe inline CID — fonctionne dans tous les clients email
// (Gmail, Apple Mail, Outlook). Alternative robuste aux data URIs (strippées par Gmail).
const ICON_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAACvElEQVR42uWbiVIaQRCG5/W49uQBE3PHBBEBEREBAS8QEe8Lb3PnETqzByVYVBToXhb7q/of4Pthd2Z6QIghuQ28gZvgW5l3cC1zFXwv8wEugx/tXAQ/yXyGdnAa2qFpOA99kfkKZ6GYndPQjEwcTmSOQ7MyCTgKz9k5DCdlUnAQTtvZD8/LZGAvvGBnN5KVWYRWJAc7dpZAUHIfeAV3gdcyU2CJ+02+Gcnb2Y4syxSgESlCQykCivikym8pJZkVqCtlYC1vpaZUgLV8TanCprIKrOWtbChrwFp+XV23w1p+Td2Q2YQXs9QNI7+q1oC1vJWqWn8ogaN8Vd3qLoCffEVtQM++npt8RXtUADf5srYNrOXLWhNWtB0QnOXdAvjKl7QWCAp5i0mQL2m7ICg++W78LF90CsD/2vfDj/IFbQ8ExTP/P/wkX9D2nQKwX3hP4Rf5Zf0ABMXb/rmMW94tAH+pG5Rxyef1QxAU6/yweC2f149kAQSbnFHwUn5JPwZBscPDwAt5twD87S0mlPI5/QQExd4eGyr5nH7qFIB9sKECW35RPwNBcaqjBkveLQD/SOsVo8pnjXMQFOd5LxlFPmu0QVAMMyZFfsG4sArAn+TQi7dQ5DNWARRjLD8/893yGePSKQB7hkchTiE/b1yBoBhgToq8WwD+9BZnrW+Sy6eNaxAU01u/bHKekk8bN04B2KPrSZFPGbcgKOb2g4K5tx9EPmXaBeDP7Z8tjnywGVQ+ad6BoLi0GMepbhj5pHnvFIB9aTEp8nPmNxAUNzb9xeu+k3cLwL+uejzN8at8wvwOwm93dV7KJ8wfIDjLz5o/rQL4ysetAixYy1twlI+bv7oL4Cc/E/39UABH+d4CGMrHon96fzHOWt6Ck3ws+rf/v0ZYy3dgLd+BtXwH1vIdWMt282KWOkx8e7AZkH+VGkg8Cz4YKgAAAABJRU5ErkJggg==";

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
          attachments: [
            {
              filename: "icon.png",
              content: Buffer.from(ICON_PNG_BASE64, "base64"),
              contentType: "image/png",
              contentId: "playground-icon",
            },
          ],
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
    session({ session, user }) {
      session.user.id = user.id;
      const dbUser = user as unknown as { onboardingCompleted: boolean; role: "USER" | "ADMIN" };
      session.user.onboardingCompleted = dbUser.onboardingCompleted;
      session.user.role = dbUser.role;
      return session;
    },
  },
});
