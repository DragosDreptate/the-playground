import { handlers } from "@/infrastructure/auth/auth.config";

export const { GET, POST } = handlers;

// Short-circuit HEAD : les scanners de sécurité d'email (Microsoft Defender Safe
// Links, Mimecast, Proofpoint…) prefetchent les liens en HEAD avant l'utilisateur.
// Sans cette réponse, Auth.js lève "Only GET and POST requests are supported"
// et pollue Sentry. On renvoie 200 sans toucher au token.
export function HEAD() {
  return new Response(null, { status: 200 });
}
