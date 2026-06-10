"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Mail, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sendMomentHostMessageAction } from "@/app/actions/send-moment-host-message";
import type { HostMessageSegment } from "@/domain/models/registration";

const SOFT_LIMIT_MS = 24 * 60 * 60 * 1000;
const SUBJECT_MAX_LENGTH = 150;
const BODY_MAX_TEXT_LENGTH = 5000;

type Props = {
  momentId: string;
  momentTitle: string;
  registeredCount: number;
  waitlistedCount: number;
  /** ISO string du dernier message envoyé. null = jamais envoyé. */
  lastHostMessageSentAt: string | null;
};

export function HostMessageDialog({
  momentId,
  momentTitle,
  registeredCount,
  waitlistedCount,
  lastHostMessageSentAt,
}: Props) {
  const t = useTranslations("Moment.hostMessage");
  const [open, setOpen] = React.useState(false);
  const [segment, setSegment] = React.useState<HostMessageSegment>("REGISTERED");
  const [subject, setSubject] = React.useState("");
  const [bodyHtml, setBodyHtml] = React.useState("");
  const [bodyTextLength, setBodyTextLength] = React.useState(0);
  const [isPending, setIsPending] = React.useState(false);
  // La clé force un remontage de l'éditeur (vide) à la réouverture du dialog
  const [editorKey, setEditorKey] = React.useState(0);

  const hasWaitlist = waitlistedCount > 0;
  const segmentCounts: Record<HostMessageSegment, number> = {
    REGISTERED: registeredCount,
    WAITLISTED: waitlistedCount,
    ALL: registeredCount + waitlistedCount,
  };
  const recipientCount = hasWaitlist ? segmentCounts[segment] : registeredCount;

  const lastSentAt = lastHostMessageSentAt ? new Date(lastHostMessageSentAt) : null;
  const showSoftLimitWarning =
    lastSentAt !== null && Date.now() - lastSentAt.getTime() < SOFT_LIMIT_MS;

  const canSend =
    !isPending &&
    subject.trim().length > 0 &&
    subject.trim().length <= SUBJECT_MAX_LENGTH &&
    bodyTextLength > 0 &&
    bodyTextLength <= BODY_MAX_TEXT_LENGTH &&
    recipientCount > 0;

  function resetForm() {
    setSegment("REGISTERED");
    setSubject("");
    setBodyHtml("");
    setBodyTextLength(0);
    setEditorKey((k) => k + 1);
  }

  async function handleSend() {
    setIsPending(true);
    try {
      const result = await sendMomentHostMessageAction({
        momentId,
        segment: hasWaitlist ? segment : "REGISTERED",
        subject: subject.trim(),
        bodyHtml,
      });
      if (result.success) {
        toast.success(t("successToast", { count: result.data.recipientCount }));
        setOpen(false);
        resetForm();
      } else {
        toast.error(
          result.code === "HOST_MESSAGE_NO_RECIPIENTS"
            ? t("noRecipientsError")
            : result.error
        );
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isPending) setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label={t("writeButton")}
          className="shrink-0 gap-1.5 max-lg:w-8 max-lg:px-0"
        >
          <Mail className="size-4" />
          <span className="hidden lg:inline">{t("writeButton")}</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <div className="bg-primary/10 border-primary/20 flex size-[34px] shrink-0 items-center justify-center rounded-[9px] border">
              <Mail className="text-primary size-[18px]" />
            </div>
            {t("dialogTitle")}
          </DialogTitle>
          <DialogDescription>
            {hasWaitlist
              ? t("dialogDescription", { momentTitle })
              : t("dialogDescriptionNoWaitlist", {
                  momentTitle,
                  count: registeredCount,
                })}
          </DialogDescription>
        </DialogHeader>

        {showSoftLimitWarning && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-[13px] leading-snug text-amber-700 dark:text-amber-400">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <span>{t("softLimitWarning")}</span>
          </div>
        )}

        {hasWaitlist && (
          <div className="border-border flex items-center gap-2 border-b pb-2.5">
            <span className="text-muted-foreground text-[13px] font-medium">
              {t("toLabel")}
            </span>
            <Select
              value={segment}
              onValueChange={(v) => setSegment(v as HostMessageSegment)}
              disabled={isPending}
            >
              <SelectTrigger size="sm" className="w-auto gap-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="REGISTERED">
                  {t("segmentRegistered")} · {segmentCounts.REGISTERED}
                </SelectItem>
                <SelectItem value="WAITLISTED">
                  {t("segmentWaitlisted")} · {segmentCounts.WAITLISTED}
                </SelectItem>
                <SelectItem value="ALL">
                  {t("segmentAll")} · {segmentCounts.ALL}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="host-message-subject">{t("subjectLabel")}</Label>
          <Input
            id="host-message-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t("subjectPlaceholder")}
            maxLength={SUBJECT_MAX_LENGTH}
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="host-message-body">{t("bodyLabel")}</Label>
            <span className="text-muted-foreground text-xs tabular-nums">
              {bodyTextLength} / {BODY_MAX_TEXT_LENGTH}
            </span>
          </div>
          <RichTextEditor
            key={editorKey}
            id="host-message-body"
            placeholder={t("bodyPlaceholder")}
            initialContent={bodyHtml}
            disabled={isPending}
            onChange={(html, textLength) => {
              setBodyHtml(html);
              setBodyTextLength(textLength);
            }}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            {t("cancelButton")}
          </Button>
          <Button onClick={handleSend} disabled={!canSend}>
            {isPending ? t("sending") : t("sendButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
