"use server";

import { cookies } from "next/headers";
import { signIn, signOut } from "@/infrastructure/auth/auth.config";
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
  await signIn("github", { redirectTo: callbackUrl ?? "/dashboard" });
}

export async function signInWithGoogle(formData: FormData) {
  const callbackUrl = safeCallbackUrl(formData.get("callbackUrl") as string);
  if (callbackUrl) await setCallbackCookie(callbackUrl);
  await signIn("google", { redirectTo: callbackUrl ?? "/dashboard" });
}

export async function signInWithEmail(formData: FormData) {
  const email = formData.get("email") as string;
  const callbackUrl = safeCallbackUrl(formData.get("callbackUrl") as string);
  if (callbackUrl) await setCallbackCookie(callbackUrl);
  await signIn("resend", { email, redirectTo: callbackUrl ?? "/dashboard" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
