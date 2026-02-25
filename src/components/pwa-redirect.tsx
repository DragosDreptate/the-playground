"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

type Props = {
  isLoggedIn: boolean;
};

/**
 * Détecte le mode PWA (standalone) et redirige automatiquement :
 * - Connecté → /dashboard
 * - Non connecté → /auth/sign-in
 *
 * Invisible en mode navigateur web normal.
 */
export function PwaRedirect({ isLoggedIn }: Props) {
  const router = useRouter();

  useEffect(() => {
    const isPWA =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;

    if (isPWA) {
      router.replace(isLoggedIn ? "/dashboard" : "/auth/sign-in");
    }
  }, [isLoggedIn, router]);

  return null;
}
