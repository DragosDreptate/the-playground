import * as Sentry from "@sentry/nextjs";
import { redirect } from "next/navigation";
import {
  AUTH_ERROR_VERIFICATION,
  classifyAuthError,
  normalizeAuthErrorCode,
} from "@/lib/auth/error-kinds";
import { getRequestObservability } from "@/lib/auth/request-observability";
import { getCachedSession } from "@/lib/auth-cache";
import { safeCallbackUrl } from "@/lib/url";
import { AuthErrorView } from "./auth-error-view";

type Props = {
  searchParams: Promise<{ error?: string | string[]; callbackUrl?: string }>;
};

// Capture côté serveur : les réseaux d'entreprise/administration qui bloquent
// sentry.io (incident réseau d'administration) ne remontent jamais une capture
// client. Le rendu serveur, lui, voit chaque visite de la page avec son
// user-agent — ce qui permet de distinguer humains et scanners email.
export default async function AuthErrorPage({ searchParams }: Props) {
  const params = await searchParams;
  // Un param répété (?error=a&error=b) arrive en string[] — on ne garde que
  // la première valeur, comme le faisait useSearchParams().get().
  const error = Array.isArray(params.error) ? params.error[0] : params.error;

  // Magic link expiré/invalide, mais l'utilisateur a déjà une session valide
  // dans ce navigateur : il n'avait pas besoin du lien pour revenir (cas typique :
  // il croit devoir recliquer un lien alors que sa session est encore active). On
  // le reconnecte en transparence — redirection serveur, aucun écran d'erreur
  // rendu — au lieu de l'envoyer sur un cul-de-sac. On ne réutilise PAS le token
  // périmé : on s'appuie uniquement sur la session déjà présente (zéro élévation).
  // Placé avant la capture Sentry : un utilisateur déjà connecté n'est pas une erreur.
  if (normalizeAuthErrorCode(error) === AUTH_ERROR_VERIFICATION) {
    const session = await getCachedSession();
    if (session) {
      redirect(safeCallbackUrl(params.callbackUrl) ?? "/dashboard");
    }
  }

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
