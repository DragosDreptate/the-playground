"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// Workaround pour le warning React 19 "Encountered a script tag while rendering React component".
// next-themes injecte un <script> inline pour éviter le FOUC du dark mode. Au rerender client,
// React 19 (bundled par Next 16.2+) avertit. En passant type="application/json" uniquement côté
// client, le script reste exécutable au SSR (premier rendu) mais devient inerte au rerender client,
// ce qui supprime le warning sans casser le dark mode.
// Voir https://github.com/pacocoursey/next-themes/issues/387
const scriptProps =
  typeof window === "undefined" ? undefined : ({ type: "application/json" } as const);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      scriptProps={scriptProps}
    >
      {children}
    </NextThemesProvider>
  );
}
