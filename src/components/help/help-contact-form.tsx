"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendContactMessageAction } from "@/app/actions/contact";

interface HelpContactFormProps {
  strings: {
    nameLabel: string;
    namePlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    messageLabel: string;
    messagePlaceholder: string;
    submit: string;
    sending: string;
    success: string;
    error: string;
  };
}

type FormState = "idle" | "sending" | "success" | "error";

export function HelpContactForm({ strings }: HelpContactFormProps) {
  const [state, setState] = useState<FormState>("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    const formData = new FormData(e.currentTarget);
    const result = await sendContactMessageAction(formData);
    setState(result.success ? "success" : "error");
  }

  if (state === "success") {
    return (
      <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-400">
        {strings.success}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Honeypot — invisible pour les humains, les bots le remplissent */}
      <input
        type="text"
        name="_info"
        aria-hidden="true"
        tabIndex={-1}
        autoComplete="new-password"
        style={{ position: "absolute", left: "-9999px", top: "-9999px", opacity: 0, pointerEvents: "none" }}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="contact-name">{strings.nameLabel}</Label>
          <Input
            id="contact-name"
            name="name"
            placeholder={strings.namePlaceholder}
            required
            disabled={state === "sending"}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact-email">{strings.emailLabel}</Label>
          <Input
            id="contact-email"
            name="email"
            type="email"
            placeholder={strings.emailPlaceholder}
            required
            disabled={state === "sending"}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contact-message">{strings.messageLabel}</Label>
        <Textarea
          id="contact-message"
          name="message"
          placeholder={strings.messagePlaceholder}
          rows={4}
          required
          disabled={state === "sending"}
        />
      </div>
      {state === "error" && (
        <p className="text-sm text-destructive">{strings.error}</p>
      )}
      <Button type="submit" disabled={state === "sending"}>
        {state === "sending" ? strings.sending : strings.submit}
      </Button>
    </form>
  );
}
