"use client";

import { useState, useTransition } from "react";
import { Link as NextIntlLink } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyLinkButton } from "@/components/moments/copy-link-button";
import { inviteToCircleByEmailAction } from "@/app/actions/circle";
import { Link as LinkIcon, UserPlus, Mail, Plus, X, Check } from "lucide-react";
import { stripProtocol } from "@/lib/url";

type Props = {
  circleId: string;
  circleSlug: string;
  publicUrl: string;
  t: {
    cardTitle: string;
    shareableLink: string;
    emailTitle: string;
    emailPlaceholder: string;
    emailSend: string;
    emailSendMultiple: string;
    emailSent: string;
    emailInvalid: string;
    emailAddMore: string;
    emailMaxReached: string;
  };
};

const MAX_EMAIL_FIELDS = 10;

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function CircleShareInviteCard({ circleId, circleSlug, publicUrl, t }: Props) {
  const [emailFields, setEmailFields] = useState<string[]>([""]);
  const [emailError, setEmailError] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [isPendingEmail, startEmail] = useTransition();

  function handleEmailChange(idx: number, value: string) {
    setEmailFields((prev) => prev.map((f, i) => (i === idx ? value : f)));
    if (emailError) setEmailError("");
  }

  function handleAddField() {
    if (emailFields.length >= MAX_EMAIL_FIELDS) return;
    setEmailFields((prev) => [...prev, ""]);
  }

  function handleRemoveField(idx: number) {
    setEmailFields((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSendEmails() {
    const emails = emailFields.map((e) => e.trim()).filter(Boolean);
    if (emails.length === 0) return;
    const invalid = emails.find((e) => !isValidEmail(e));
    if (invalid) {
      setEmailError(t.emailInvalid);
      return;
    }

    startEmail(async () => {
      const result = await inviteToCircleByEmailAction(circleId, emails);
      if (result.success) {
        setEmailFields([""]);
        setEmailSent(true);
        setTimeout(() => setEmailSent(false), 3000);
      }
    });
  }

  const filledEmails = emailFields.map((e) => e.trim()).filter(Boolean);

  return (
    <div className="bg-card border-border rounded-2xl border p-6">
      {/* Card title */}
      <div className="mb-4 flex items-center gap-2">
        <p className="text-[17px] font-semibold">{t.cardTitle}</p>
      </div>

      {/* ── Row 1 : Lien partageable ── */}
      <div className="flex items-start gap-3 pt-0 pb-3">
        <div className="bg-primary/10 text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
          <LinkIcon className="size-[15px]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="mb-1.5 text-[13px] font-medium">{t.shareableLink}</p>
          <div className="flex items-center gap-2">
            <NextIntlLink
              href={`/circles/${circleSlug}`}
              target="_blank"
              className="border-border bg-muted/50 hover:border-primary min-w-0 flex-1 truncate rounded-lg border px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors"
            >
              {stripProtocol(publicUrl)}
            </NextIntlLink>
            <CopyLinkButton value={publicUrl} />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-border ml-11 border-t" />

      {/* ── Row 2 : Inviter par email ── */}
      <div className="flex items-start gap-3 py-3">
        <div className="bg-primary/10 text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
          <UserPlus className="size-[15px]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="mb-3 text-[13px] font-medium">{t.emailTitle}</p>

          {/* Email fields */}
          <div className="flex flex-col gap-2 mb-3">
            {emailFields.map((field, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  type="email"
                  placeholder={idx === 0 ? t.emailPlaceholder : t.emailAddMore}
                  value={field}
                  onChange={(e) => handleEmailChange(idx, e.target.value)}
                  className="h-8 flex-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveField(idx)}
                  disabled={emailFields.length === 1}
                  className="border-border text-muted-foreground hover:bg-muted hover:text-foreground flex size-7 shrink-0 items-center justify-center rounded-md border disabled:cursor-default disabled:opacity-30"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>

          {emailError && (
            <p className="text-destructive mb-2 text-xs">{emailError}</p>
          )}

          {/* Ajouter une adresse */}
          {emailFields.length < MAX_EMAIL_FIELDS ? (
            <button
              type="button"
              onClick={handleAddField}
              className="text-primary mb-3 inline-flex items-center gap-1.5 text-xs font-medium hover:opacity-80"
            >
              <Plus className="size-3" />
              {t.emailAddMore}
            </button>
          ) : (
            <p className="text-muted-foreground mb-3 text-xs">
              {t.emailMaxReached}
            </p>
          )}

          {/* CTA */}
          {emailSent ? (
            <div className="text-foreground flex items-center gap-1.5 text-sm font-medium text-green-600">
              <Check className="size-4 shrink-0" />
              <span>{t.emailSent}</span>
            </div>
          ) : (
            <Button
              type="button"
              onClick={handleSendEmails}
              disabled={filledEmails.length === 0 || isPendingEmail}
              className="flex h-9 w-full items-center justify-center gap-2 text-[13px]"
            >
              <Mail className="size-3.5" />
              {isPendingEmail
                ? "..."
                : filledEmails.length > 1
                  ? t.emailSendMultiple
                  : t.emailSend}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
