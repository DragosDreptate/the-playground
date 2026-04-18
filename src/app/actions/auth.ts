"use server";

import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { signIn, signOut } from "@/infrastructure/auth/auth.config";
import { isValidEmail } from "@/lib/email";
import { safeCallbackUrl } from "@/lib/url";

async function setCallbackCookie(callbackUrl: string) {
  (await cookies()).set("auth-callback-url", callbackUrl, {
    httpOnly: true,
    maxAge: 60 * 30,
    path: "/",
  });
}

export async function signInWithGitHub(formData: FormData) {
  const callbackUrl = safeCallbackUrl(formData.get("callbackUrl") as string);
  if (callbackUrl) await setCallbackCookie(callbackUrl);
  // Toujours passer par le setup : la page setup redirige vers callbackUrl
  // si le profil est déjà complété, sinon affiche le formulaire.
  await signIn("github", { redirectTo: "/dashboard/profile/setup" });
}

export async function signInWithGoogle(formData: FormData) {
  const callbackUrl = safeCallbackUrl(formData.get("callbackUrl") as string);
  if (callbackUrl) await setCallbackCookie(callbackUrl);
  await signIn("google", { redirectTo: "/dashboard/profile/setup" });
}

export type SignInWithEmailState =
  | { error: "INVALID_EMAIL" | "SEND_FAILED" }
  | null;

export async function signInWithEmail(
  _prev: SignInWithEmailState,
  formData: FormData
): Promise<SignInWithEmailState> {
  const email = ((formData.get("email") as string | null) ?? "").trim();
  if (!isValidEmail(email)) {
    return { error: "INVALID_EMAIL" };
  }
  const callbackUrl = safeCallbackUrl(formData.get("callbackUrl") as string);
  if (callbackUrl) await setCallbackCookie(callbackUrl);
  try {
    await signIn("resend", { email, redirectTo: "/dashboard/profile/setup" });
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
