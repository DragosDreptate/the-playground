"use server";

import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { getLocale } from "next-intl/server";
import { signIn, signOut } from "@/infrastructure/auth/auth.config";
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

export async function signInWithGitHub(formData: FormData) {
  const callbackUrl = safeCallbackUrl(formData.get("callbackUrl") as string);
  if (callbackUrl) await setCallbackCookie(callbackUrl);
  // Toujours passer par le setup : la page setup redirige vers callbackUrl
  // si le profil est déjà complété, sinon affiche le formulaire.
  await signIn("github", { redirectTo: await postSignInRedirectTo() });
}

export async function signInWithGoogle(formData: FormData) {
  const callbackUrl = safeCallbackUrl(formData.get("callbackUrl") as string);
  if (callbackUrl) await setCallbackCookie(callbackUrl);
  await signIn("google", { redirectTo: await postSignInRedirectTo() });
}

export type SignInWithEmailState =
  | { error: "INVALID_EMAIL" | "DISPOSABLE_EMAIL" | "SEND_FAILED" }
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
