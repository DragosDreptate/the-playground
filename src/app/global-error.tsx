"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Quelque chose s&apos;est mal passé</h1>
            <p className="text-muted-foreground max-w-sm">
              Une erreur inattendue s&apos;est produite. Notre équipe en a été notifiée.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <a
              href="/"
              className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Retour à l&apos;accueil
            </a>
            <button
              onClick={reset}
              className="text-muted-foreground text-sm hover:underline"
            >
              Réessayer
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
