import * as Sentry from "@sentry/nextjs";
import { headers } from "next/headers";
import { classifyAuthError } from "@/lib/auth/error-kinds";
import { AuthErrorView } from "./auth-error-view";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

// Capture côté serveur : les réseaux d'entreprise/administration qui bloquent
// sentry.io (incident @interieur.gouv.fr) ne remontent jamais une capture
// client. Le rendu serveur, lui, voit chaque visite de la page avec son
// user-agent — ce qui permet de distinguer humains et scanners email.
export default async function AuthErrorPage({ searchParams }: Props) {
  const { error } = await searchParams;

  if (error) {
    const headersList = await headers();
    Sentry.captureMessage(`auth-error-page: ${error}`, {
      level: "warning",
      tags: {
        context: "auth",
        error_code: error,
        auth_error_kind: classifyAuthError(error),
        surface: "server",
      },
      extra: {
        user_agent: headersList.get("user-agent") ?? "unknown",
        referer: headersList.get("referer") ?? "unknown",
      },
    });
  }

  return <AuthErrorView error={error ?? null} />;
}
