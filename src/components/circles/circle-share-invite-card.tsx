"use client";

import { useState, useTransition } from "react";
import { Link as NextIntlLink } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CopyLinkButton } from "@/components/moments/copy-link-button";
import {
  generateCircleInviteTokenAction,
  revokeCircleInviteTokenAction,
  inviteToCircleByEmailAction,
} from "@/app/actions/circle";
import type { Circle } from "@/domain/models/circle";
import { Link as LinkIcon, UserPlus, Copy, Mail, Plus, X, Check } from "lucide-react";
import { useRouter } from "@/i18n/navigation";

type Props = {
  circle: Circle;
  publicUrl: string;
  t: {
    cardTitle: string;
    shareableLink: string;
    emailTitle: string;
    emailPlaceholder: string;
    emailAdd: string;
    emailSend: string;
    emailSendMultiple: string;
    emailSent: string;
    emailInvalid: string;
    linkTitle: string;
    linkDescription: string;
    linkGenerate: string;
    linkRevoke: string;
    linkRevoked: string;
    copyLink: string;
    copied: string;
  };
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function CircleShareInviteCard({ circle, publicUrl, t }: Props) {
  const router = useRouter();

  // ── Email state ──
  // List of email fields (each is a string, possibly empty)
  const [emailFields, setEmailFields] = useState<string[]>([""]);
  const [emailError, setEmailError] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  // ── Invite link state ──
  const [inviteUrl, setInviteUrl] = useState<string | null>(
    circle.inviteToken
      ? `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/circles/join/${circle.inviteToken}`
      : null
  );

  const [isPendingRevoke, startRevoke] = useTransition();
  const [isPendingEmail, startEmail] = useTransition();

  // ── Email handlers ──
  function handleEmailChange(idx: number, value: string) {
    setEmailFields((prev) => prev.map((f, i) => (i === idx ? value : f)));
    if (emailError) setEmailError("");
  }

  function handleAddField() {
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
      const result = await inviteToCircleByEmailAction(circle.id, emails);
      if (result.success) {
        setEmailFields([""]);
        setEmailSent(true);
        setTimeout(() => setEmailSent(false), 3000);
      }
    });
  }

  // ── Invite link handlers ──
  // Révoquer et générer un nouveau lien immédiatement (conforme au mockup)
  function handleRevoke() {
    startRevoke(async () => {
      await revokeCircleInviteTokenAction(circle.id);
      const result = await generateCircleInviteTokenAction(circle.id);
      if (result.success) {
        setInviteUrl(result.data.inviteUrl);
        router.refresh();
      }
    });
  }

  const filledEmails = emailFields.map((e) => e.trim()).filter(Boolean);

  return (
    <div className="bg-card border-border rounded-2xl border p-6">
      {/* Card title */}
      <div className="mb-4 flex items-center gap-2">
        <p className="text-[17px] font-semibold">{t.cardTitle}</p>
        <Badge
          variant="outline"
          className="border-primary/30 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wide px-2 py-0.5"
        >
          Nouveau
        </Badge>
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
              href={`/circles/${circle.slug}`}
              target="_blank"
              className="border-border bg-muted/50 hover:border-primary min-w-0 flex-1 truncate rounded-lg border px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors"
            >
              {publicUrl.replace(/^https?:\/\//, "")}
            </NextIntlLink>
            <CopyLinkButton value={publicUrl} />
          </div>
        </div>
      </div>

      {/* Divider — ml-11 (44px = icon 32 + gap 12) */}
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
                  placeholder={idx === 0 ? t.emailPlaceholder : "Ajouter un email…"}
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
          <button
            type="button"
            onClick={handleAddField}
            className="text-primary mb-3 inline-flex items-center gap-1.5 text-xs font-medium hover:opacity-80"
          >
            <Plus className="size-3" />
            Ajouter une adresse
          </button>

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

      {/* Divider */}
      <div className="border-border ml-11 border-t" />

      {/* ── Row 3 : Lien d'invitation ── */}
      <div className="flex items-start gap-3 pb-0 pt-3">
        <div className="bg-primary/10 text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
          <Copy className="size-[15px]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="mb-1.5 text-[13px] font-medium">{t.linkTitle}</p>
          <p className="text-muted-foreground mb-2 text-xs leading-[1.5]">
            {t.linkDescription}
          </p>

          {inviteUrl && (
            <>
              <div className="flex items-center gap-2">
                <div className="border-border bg-muted/50 hover:border-primary min-w-0 flex-1 truncate rounded-lg border px-3 py-[7px] font-mono text-xs text-muted-foreground transition-colors">
                  {inviteUrl.replace(/^https?:\/\//, "")}
                </div>
                <InlineCopyButton value={inviteUrl} />
              </div>
              <button
                type="button"
                onClick={handleRevoke}
                disabled={isPendingRevoke}
                className="text-muted-foreground hover:text-foreground mt-1.5 block text-[11px] underline underline-offset-2 disabled:cursor-wait"
              >
                {isPendingRevoke ? "..." : "Révoquer et générer un nouveau lien"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Bouton copier compact — label court "Copier" (vs "Copier le lien" dans CopyLinkButton)
function InlineCopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="border-border text-foreground hover:bg-muted flex h-[30px] shrink-0 items-center gap-1.5 rounded-md border bg-transparent px-2.5 text-xs font-medium transition-colors"
    >
      {copied ? (
        <Check className="size-3 text-green-500" />
      ) : (
        <Copy className="size-3" />
      )}
      {copied ? "Copié !" : "Copier"}
    </button>
  );
}
