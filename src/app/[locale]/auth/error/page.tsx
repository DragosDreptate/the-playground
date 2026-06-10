import * as Sentry from "@sentry/nextjs";
import {
  classifyAuthError,
  normalizeAuthErrorCode,
} from "@/lib/auth/error-kinds";
import { getRequestObservability } from "@/lib/auth/request-observability";
import { AuthErrorView } from "./auth-error-view";

type Props = {
  searchParams: Promise<{ error?: string | string[] }>;
};

// Capture côté serveur : les réseaux d'entreprise/administration qui bloquent
// sentry.io (incident @interieur.gouv.fr) ne remontent jamais une capture
// client. Le rendu serveur, lui, voit chaque visite de la page avec son
// user-agent — ce qui permet de distinguer humains et scanners email.
export default async function AuthErrorPage({ searchParams }: Props) {
  const params = await searchParams;
  // Un param répété (?error=a&error=b) arrive en string[] — on ne garde que
  // la première valeur, comme le faisait useSearchParams().get().
  const error = Array.isArray(params.error) ? params.error[0] : params.error;

  if (error) {
    // Le code normalisé borne la cardinalité des tags/messages Sentry
    // (?error= est contrôlable par l'utilisateur) ; la valeur brute reste
    // disponible en extra.
    const code = normalizeAuthErrorCode(error);
    Sentry.captureMessage(`auth-error-page: ${code}`, {
      level: "warning",
      tags: {
        context: "auth",
        error_code: code,
        auth_error_kind: classifyAuthError(code),
        surface: "server",
      },
      extra: {
        raw_error: error,
        ...(await getRequestObservability()),
      },
    });
  }

  return <AuthErrorView error={error ?? null} />;
}
