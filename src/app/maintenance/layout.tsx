import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Maintenance — The Playground",
  robots: { index: false, follow: false },
};

// Layout autonome (hors [locale]) : zéro provider, zéro appel DB/auth/service
// externe. Doit survivre à un incident majeur, c'est tout l'intérêt de la page.
export default function MaintenanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" translate="no" suppressHydrationWarning>
      <body
        className={`${inter.variable} bg-background text-foreground font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
