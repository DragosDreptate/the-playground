"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Mail, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
// Tiptap/ProseMirror (~80 KB gzip) chargé uniquement à l'ouverture de la modale,
// pas dans le bundle de la page détail événement.
const RichTextEditor = dynamic(
  () => import("@/components/ui/rich-text-editor").then((m) => m.RichTextEditor),
  { ssr: false, loading: () => <Skeleton className="h-40 w-full rounded-md" /> }
);
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sendMomentHostMessageAction } from "@/app/actions/send-moment-host-message";
import {
  HOST_MESSAGE_BODY_MAX_TEXT_LENGTH,
  HOST_MESSAGE_SUBJECT_MAX_LENGTH,
  type HostMessageSegment,
} from "@/domain/models/registration";

const SOFT_LIMIT_MS = 24 * 60 * 60 * 1000;

/** Codes d'erreur de l'action → clés i18n (jamais de message serveur brut). */
const ERROR_KEYS: Record<string, string> = {
  HOST_MESSAGE_NO_RECIPIENTS: "noRecipientsError",
  MOMENT_UNAUTHORIZED: "unauthorizedError",
  HOST_MESSAGE_DRAFT: "draftError",
  HOST_MESSAGE_SUBJECT_INVALID: "subjectInvalidError",
  HOST_MESSAGE_BODY_EMPTY: "bodyEmptyError",
  HOST_MESSAGE_BODY_TOO_LONG: "bodyTooLongError",
  MOMENT_NOT_FOUND: "notFoundError",
};

type Props = {
  momentId: string;
  momentTitle: string;
  momentSlug: string;
  circleSlug: string;
  registeredCount: number;
  waitlistedCount: number;
  /** ISO string du dernier message envoyé. null = jamais envoyé. */
  lastHostMessageSentAt: string | null;
};

export function HostMessageDialog({
  momentId,
  momentTitle,
  momentSlug,
  circleSlug,
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
    subject.trim().length <= HOST_MESSAGE_SUBJECT_MAX_LENGTH &&
    bodyTextLength > 0 &&
    bodyTextLength <= HOST_MESSAGE_BODY_MAX_TEXT_LENGTH &&
    recipientCount > 0;

  function resetForm() {
    setSegment("REGISTERED");
    setSubject("");
    setBodyHtml("");
    setBodyTextLength(0);
  }

  async function handleSend() {
    setIsPending(true);
    try {
      const result = await sendMomentHostMessageAction({
        momentId,
        momentSlug,
        circleSlug,
        segment: hasWaitlist ? segment : "REGISTERED",
        subject: subject.trim(),
        bodyHtml,
      });
      if (result.success) {
        toast.success(t("successToast", { count: result.data.recipientCount }));
        setOpen(false);
        resetForm();
      } else {
        toast.error(t(ERROR_KEYS[result.code] ?? "genericError"));
      }
    } catch {
      // Échec de la requête elle-même (réseau, redéploiement) — toActionResult
      // ne couvre que les erreurs côté serveur.
      toast.error(t("genericError"));
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
            maxLength={HOST_MESSAGE_SUBJECT_MAX_LENGTH}
            disabled={isPending}
            // Focus neutre, aligné sur l'éditeur en dessous (pas de ring rose)
            className="focus-visible:border-muted-foreground/40 focus-visible:ring-0"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="host-message-body">{t("bodyLabel")}</Label>
            <span className="text-muted-foreground text-xs tabular-nums">
              {bodyTextLength} / {HOST_MESSAGE_BODY_MAX_TEXT_LENGTH}
            </span>
          </div>
          <RichTextEditor
            id="host-message-body"
            placeholder={t("bodyPlaceholder")}
            initialContent={bodyHtml}
            disabled={isPending}
            tokens={[{ label: t("firstNameTokenLabel"), value: t("firstNameToken") }]}
            onChange={(html, textLength) => {
              setBodyHtml(html);
              setBodyTextLength(textLength);
            }}
          />
          <p className="text-muted-foreground text-xs leading-snug">
            {t("firstNameTokenHint", { token: t("firstNameToken") })}
          </p>
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
