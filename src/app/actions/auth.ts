"use server";

import { signIn, signOut } from "@/infrastructure/auth/auth.config";

export async function signInWithGitHub() {
  await signIn("github", { redirectTo: "/dashboard" });
}

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/dashboard" });
}

export async function signInWithEmail(formData: FormData) {
  const email = formData.get("email") as string;
  await signIn("resend", { email, redirectTo: "/dashboard" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
