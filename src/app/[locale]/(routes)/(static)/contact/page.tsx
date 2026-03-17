import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/contact/contact-form";

export const metadata: Metadata = {
  title: "Contact — The Playground",
  description: "Contactez l'équipe The Playground. On répond personnellement sous 24h.",
  openGraph: {
    title: "Contact — The Playground",
    description: "Contactez l'équipe The Playground. On répond personnellement sous 24h.",
  },
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 md:py-24">
      {/* Hero */}
      <div className="mb-10 space-y-3 text-center">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Contactez-nous</h1>
        <p className="mx-auto max-w-md text-base text-muted-foreground">
          Une question, une idée, un retour ? On lit tous les messages et on répond
          personnellement sous 24h.
        </p>
      </div>

      {/* Formulaire */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
        <ContactForm />
      </div>

      {/* Note */}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Pas de compte nécessaire. Pour les questions fréquentes, consultez la{" "}
        <Link href="/help" className="text-primary hover:underline">
          page Aide
        </Link>
        .
      </p>
    </div>
  );
}
