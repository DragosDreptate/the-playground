"use server";

import { cookies } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { getLocale } from "next-intl/server";
import { signIn, signOut } from "@/infrastructure/auth/auth.config";
import { evaluateBotSignIn } from "@/infrastructure/security/bot-protection";
import { routing } from "@/i18n/routing";
import { isValidEmail } from "@/lib/email";
import { isDisposableEmailDomain } from "@/lib/email/disposable-domains";
import { safeCallbackUrl } from "@/lib/url";

async function setCallbackCookie(callbackUrl: string) {
  (await cookies()).set("auth-callback-url", callbackUrl, {
    httpOnly: true,
    maxAge: 60 * 30,
    path: "/",
  });
}

// Le prefix locale dans le `redirectTo` est ce qui permet à
// `detectLocaleForMagicLink` (côté sendVerificationRequest) de servir le mail
// dans la bonne langue, indépendamment du cookie NEXT_LOCALE ou du header
// Accept-Language du navigateur. Cf. spec/magic-link-reusable-token.md (sujet
// 5). Pour les flows OAuth c'est cosmétique (le middleware next-intl
// canonicalisera l'URL).
async function postSignInRedirectTo() {
  const locale = await getLocale();
  return `/${locale}/dashboard/profile/setup`;
}

// Page de connexion dans la locale courante (locale par défaut sans préfixe,
// cf. localePrefix "as-needed"). Sert de cible de redirection quand BotID
// classe un flux OAuth comme bot.
async function signInPath() {
  const locale = await getLocale();
  return locale === routing.defaultLocale
    ? "/auth/sign-in"
    : `/${locale}/auth/sign-in`;
}

// Pour les flux OAuth : évalue BotID (selon BOTID_MODE) et, si la requête doit
// être bloquée, redirige vers la page de connexion. Le redirect interrompt
// l'action, donc l'appelant ne poursuit pas vers signIn(). La journalisation
// éventuelle est gérée dans evaluateBotSignIn.
type OAuthProvider = "google" | "github" | "linkedin";

async function redirectIfBot(provider: OAuthProvider) {
  const { shouldBlock } = await evaluateBotSignIn({ provider });
  if (shouldBlock) redirect(`${await signInPath()}?error=BotDetected`);
}

// Flux OAuth générique partagé par tous les fournisseurs : protection BotID,
// mémorisation du callbackUrl, puis délégation à Auth.js. Toujours passer par le
// setup : la page setup redirige vers callbackUrl si le profil est déjà complété,
// sinon affiche le formulaire.
async function signInWithOAuth(provider: OAuthProvider, formData: FormData) {
  await redirectIfBot(provider);
  const callbackUrl = safeCallbackUrl(formData.get("callbackUrl") as string);
  if (callbackUrl) await setCallbackCookie(callbackUrl);
  await signIn(provider, { redirectTo: await postSignInRedirectTo() });
}

export async function signInWithGitHub(formData: FormData) {
  await signInWithOAuth("github", formData);
}

export async function signInWithGoogle(formData: FormData) {
  await signInWithOAuth("google", formData);
}

export async function signInWithLinkedIn(formData: FormData) {
  await signInWithOAuth("linkedin", formData);
}

export type SignInWithEmailState =
  | { error: "INVALID_EMAIL" | "DISPOSABLE_EMAIL" | "SEND_FAILED" | "BOT_DETECTED" }
  | null;

export async function signInWithEmail(
  _prev: SignInWithEmailState,
  formData: FormData
): Promise<SignInWithEmailState> {
  const email = ((formData.get("email") as string | null) ?? "").trim();
  if (!isValidEmail(email)) {
    return { error: "INVALID_EMAIL" };
  }
  if (isDisposableEmailDomain(email)) {
    return { error: "DISPOSABLE_EMAIL" };
  }
  const { shouldBlock } = await evaluateBotSignIn({ provider: "resend", email });
  if (shouldBlock) {
    return { error: "BOT_DETECTED" };
  }
  const callbackUrl = safeCallbackUrl(formData.get("callbackUrl") as string);
  if (callbackUrl) await setCallbackCookie(callbackUrl);
  try {
    await signIn("resend", { email, redirectTo: await postSignInRedirectTo() });
  } catch (error) {
    // Relance les erreurs spéciales Next.js (redirect, notFound) pour préserver le flow nominal.
    unstable_rethrow(error);
    return { error: "SEND_FAILED" };
  }
  return null;
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
