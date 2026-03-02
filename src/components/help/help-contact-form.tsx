"use client";

import { useEffect, useRef, useState } from "react";
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
  const formRef = useRef<HTMLFormElement>(null);

  // Honeypot ajouté dynamiquement via JS — le navigateur ne peut pas l'autofiller
  // car il n'existe pas dans le HTML rendu côté serveur
  useEffect(() => {
    if (!formRef.current) return;
    const input = document.createElement("input");
    input.type = "text";
    input.name = "_info";
    input.setAttribute("aria-hidden", "true");
    input.tabIndex = -1;
    input.style.cssText =
      "position:absolute;left:-9999px;top:-9999px;opacity:0;pointer-events:none";
    formRef.current.appendChild(input);
  }, []);

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
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
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
