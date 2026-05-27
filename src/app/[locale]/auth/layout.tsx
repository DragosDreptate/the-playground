import type { Metadata } from "next";
import type { ReactNode } from "react";

// Pages de flow d'auth (sign-in, verify-request, confirm, error) :
// jamais destinées à être indexées. Évite que Google retourne ces pages
// transitoires comme résultat de recherche pour "the playground connexion".
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return children;
}
