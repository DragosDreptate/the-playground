"use server";

import { signIn, signOut } from "@/infrastructure/auth/auth.config";

export async function signInWithGitHub() {
  await signIn("github");
}

export async function signInWithGoogle() {
  await signIn("google");
}

export async function signInWithEmail(formData: FormData) {
  const email = formData.get("email") as string;
  await signIn("resend", { email });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
