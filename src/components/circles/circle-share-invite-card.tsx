"use client";

import { useState, useTransition } from "react";
import { Link as NextIntlLink } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyLinkButton } from "@/components/moments/copy-link-button";
import {
  generateCircleInviteTokenAction,
  revokeCircleInviteTokenAction,
  inviteToCircleByEmailAction,
} from "@/app/actions/circle";
import type { Circle } from "@/domain/models/circle";
import { Link as LinkIcon, Mail, UserPlus, X, Check } from "lucide-react";
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
  const [emailInput, setEmailInput] = useState("");
  const [emailList, setEmailList] = useState<string[]>([]);
  const [emailError, setEmailError] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(
    circle.inviteToken
      ? `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/circles/join/${circle.inviteToken}`
      : null
  );
  const [isPendingGenerate, startGenerate] = useTransition();
  const [isPendingRevoke, startRevoke] = useTransition();
  const [isPendingEmail, startEmail] = useTransition();

  function handleAddEmail() {
    const trimmed = emailInput.trim();
    if (!trimmed) return;
    if (!isValidEmail(trimmed)) {
      setEmailError(t.emailInvalid);
      return;
    }
    if (emailList.includes(trimmed)) {
      setEmailInput("");
      return;
    }
    setEmailList((prev) => [...prev, trimmed]);
    setEmailInput("");
    setEmailError("");
  }

  function handleRemoveEmail(email: string) {
    setEmailList((prev) => prev.filter((e) => e !== email));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddEmail();
    }
  }

  function handleGenerate() {
    startGenerate(async () => {
      const result = await generateCircleInviteTokenAction(circle.id);
      if (result.success) {
        setInviteUrl(result.data.inviteUrl);
        router.refresh();
      }
    });
  }

  function handleRevoke() {
    startRevoke(async () => {
      const result = await revokeCircleInviteTokenAction(circle.id);
      if (result.success) {
        setInviteUrl(null);
        router.refresh();
      }
    });
  }

  function handleSendEmails() {
    if (emailList.length === 0) return;
    startEmail(async () => {
      const result = await inviteToCircleByEmailAction(circle.id, emailList);
      if (result.success) {
        setEmailList([]);
        setEmailSent(true);
        setTimeout(() => setEmailSent(false), 3000);
      }
    });
  }

  return (
    <div className="border-border bg-card rounded-xl border p-4 flex flex-col gap-4">
      {/* Section 1 — Lien partageable */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <LinkIcon className="text-muted-foreground size-4 shrink-0" />
          <span className="text-sm font-medium">{t.shareableLink}</span>
        </div>
        <div className="flex items-center gap-2 lg:grid lg:grid-cols-[1fr_auto]">
          <NextIntlLink
            href={`/circles/${circle.slug}`}
            target="_blank"
            className="border-border bg-muted/50 hover:border-primary hover:bg-primary/5 rounded-lg border px-3 py-2 transition-colors min-w-0"
          >
            <span className="text-muted-foreground block truncate font-mono text-sm">
              {publicUrl.replace(/^https?:\/\//, "")}
            </span>
          </NextIntlLink>
          <CopyLinkButton value={publicUrl} />
        </div>
      </div>

      {/* Divider */}
      <div className="border-border border-t" />

      {/* Section 2 — Inviter par email */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Mail className="text-muted-foreground size-4 shrink-0" />
          <span className="text-sm font-medium">{t.emailTitle}</span>
        </div>

        <div className="flex gap-2">
          <Input
            type="email"
            placeholder={t.emailPlaceholder}
            value={emailInput}
            onChange={(e) => {
              setEmailInput(e.target.value);
              if (emailError) setEmailError("");
            }}
            onKeyDown={handleKeyDown}
            className="flex-1 h-9 text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddEmail}
            className="shrink-0"
          >
            {t.emailAdd}
          </Button>
        </div>

        {emailError && (
          <p className="text-destructive text-xs">{emailError}</p>
        )}

        {emailList.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {emailList.map((email) => (
              <span
                key={email}
                className="bg-muted text-muted-foreground flex items-center gap-1 rounded-md px-2 py-1 text-xs"
              >
                {email}
                <button
                  type="button"
                  onClick={() => handleRemoveEmail(email)}
                  className="hover:text-foreground ml-0.5"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {emailSent ? (
          <div className="flex items-center gap-1.5 text-sm text-green-600">
            <Check className="size-4 shrink-0" />
            <span>{t.emailSent}</span>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={handleSendEmails}
            disabled={emailList.length === 0 || isPendingEmail}
            className="self-start"
          >
            {isPendingEmail
              ? "..."
              : emailList.length > 1
                ? t.emailSendMultiple
                : t.emailSend}
          </Button>
        )}
      </div>

      {/* Divider */}
      <div className="border-border border-t" />

      {/* Section 3 — Lien d'invitation */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <UserPlus className="text-muted-foreground size-4 shrink-0" />
          <span className="text-sm font-medium">{t.linkTitle}</span>
        </div>

        <p className="text-muted-foreground text-xs">{t.linkDescription}</p>

        {inviteUrl ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 lg:grid lg:grid-cols-[1fr_auto]">
              <div className="border-border bg-muted/50 rounded-lg border px-3 py-2 min-w-0">
                <span className="text-muted-foreground block truncate font-mono text-xs">
                  {inviteUrl.replace(/^https?:\/\//, "")}
                </span>
              </div>
              <CopyLinkButton value={inviteUrl} />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRevoke}
              disabled={isPendingRevoke}
              className="self-start border-destructive/40 text-destructive hover:border-destructive hover:bg-destructive/10 hover:text-destructive border"
            >
              {isPendingRevoke ? "..." : t.linkRevoke}
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={isPendingGenerate}
            className="self-start"
          >
            {isPendingGenerate ? "..." : t.linkGenerate}
          </Button>
        )}
      </div>
    </div>
  );
}
