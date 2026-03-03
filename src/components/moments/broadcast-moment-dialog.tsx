"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Mail } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { broadcastMomentAction } from "@/app/actions/broadcast-moment";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

function formatTimeRemaining(until: Date): string {
  const diffMs = until.getTime() - Date.now();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMin = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (diffHours > 0) return diffMin > 0 ? `${diffHours}h ${diffMin}min` : `${diffHours}h`;
  return `${Math.max(1, diffMin)}min`;
}

type Props = {
  momentId: string;
  circleId: string;
  circleName: string;
  /** ISO string du dernier envoi. null = jamais envoyé. */
  broadcastSentAt: string | null;
};

export function BroadcastMomentDialog({
  momentId,
  circleName,
  broadcastSentAt,
}: Props) {
  const t = useTranslations("Moment.broadcast");
  const [open, setOpen] = React.useState(false);
  const [customMessage, setCustomMessage] = React.useState("");
  const [isPending, setIsPending] = React.useState(false);

  const lastSentAt = broadcastSentAt ? new Date(broadcastSentAt) : null;
  const nextAvailableAt = lastSentAt ? new Date(lastSentAt.getTime() + COOLDOWN_MS) : null;
  const inCooldown = nextAvailableAt !== null && nextAvailableAt > new Date();
  const cooldownHint = inCooldown && nextAvailableAt
    ? t("cooldownHint", { time: formatTimeRemaining(nextAvailableAt) })
    : undefined;

  async function handleSend() {
    setIsPending(true);
    try {
      const result = await broadcastMomentAction(
        momentId,
        customMessage.trim() || undefined
      );
      if (result.success) {
        toast.success(
          t("successToast", { count: result.data.recipientCount })
        );
        setOpen(false);
        setCustomMessage("");
      } else {
        toast.error(result.error);
      }
    } finally {
      setIsPending(false);
    }
  }

  const trigger = (
    <Button
      variant="outline"
      size="sm"
      disabled={inCooldown}
      className="shrink-0 gap-1.5"
    >
      <Mail className="size-4" />
      {inCooldown ? t("alreadySentShort") : t("sendButton")}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {inCooldown ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="shrink-0">{trigger}</span>
            </TooltipTrigger>
            {cooldownHint && (
              <TooltipContent side="top">{cooldownHint}</TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      ) : (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      )}

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("dialogDescription", { circleName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="broadcast-custom-message">
            {t("customMessageLabel")}
          </Label>
          <Textarea
            id="broadcast-custom-message"
            placeholder={t("customMessagePlaceholder")}
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            rows={3}
            disabled={isPending}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            {t("cancelButton")}
          </Button>
          <Button onClick={handleSend} disabled={isPending}>
            {isPending ? t("sending") : t("sendButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
