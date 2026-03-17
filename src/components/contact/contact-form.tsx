"use client";

import { useActionState } from "react";
import { sendContactMessageAction } from "@/app/actions/contact";

type FormState = { success: true } | { success: false; error: string } | null;

const inputClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const labelClassName = "text-sm font-medium text-foreground";

const SUBJECT_OPTIONS = [
  { value: "", label: "Choisir un sujet — facultatif" },
  { value: "Question générale", label: "Question générale" },
  { value: "Je veux organiser des événements", label: "Je veux organiser des événements" },
  { value: "Problème technique", label: "Problème technique" },
  { value: "Suggestion / Idée", label: "Suggestion / Idée" },
  { value: "Autre", label: "Autre" },
];

export function ContactForm() {
  async function handleSubmit(_prev: FormState, formData: FormData): Promise<FormState> {
    const result = await sendContactMessageAction(formData);
    if (result.success) return { success: true };
    return { success: false, error: result.error };
  }

  const [state, formAction, pending] = useActionState(handleSubmit, null);

  if (state?.success) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
          <svg
            className="size-7 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="space-y-1.5">
          <p className="text-base font-semibold text-foreground">Message envoyé !</p>
          <p className="text-sm text-muted-foreground">
            Merci pour votre message. On vous répond personnellement sous 24h.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      {/* Honeypot */}
      <input type="text" name="_info" className="hidden" tabIndex={-1} autoComplete="off" />

      {/* Prénom + Nom */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="firstName" className={labelClassName}>
            Prénom
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            required
            autoComplete="given-name"
            className={inputClassName}
            placeholder="Marie"
            disabled={pending}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="lastName" className={labelClassName}>
            Nom
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            required
            autoComplete="family-name"
            className={inputClassName}
            placeholder="Dupont"
            disabled={pending}
          />
        </div>
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <label htmlFor="email" className={labelClassName}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={inputClassName}
          placeholder="marie@exemple.fr"
          disabled={pending}
        />
      </div>

      {/* Sujet */}
      <div className="space-y-1.5">
        <label htmlFor="subject" className={labelClassName}>
          Sujet{" "}
          <span className="text-xs font-normal text-muted-foreground">(facultatif)</span>
        </label>
        <select
          id="subject"
          name="subject"
          className={inputClassName}
          disabled={pending}
          defaultValue=""
        >
          {SUBJECT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Message */}
      <div className="space-y-1.5">
        <label htmlFor="message" className={labelClassName}>
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Décrivez votre demande..."
          disabled={pending}
        />
      </div>

      {/* Erreur */}
      {state && !state.success && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-md bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <>
            <svg
              className="-ml-1 mr-2 size-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Envoi en cours…
          </>
        ) : (
          "Envoyer le message"
        )}
      </button>
    </form>
  );
}
