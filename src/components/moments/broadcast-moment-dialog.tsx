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

type Props = {
  momentId: string;
  circleId: string;
  circleName: string;
  /** Chaîne pré-formatée côté serveur. null = pas encore envoyé. */
  broadcastSentAtLabel: string | null;
};

export function BroadcastMomentDialog({
  momentId,
  circleName,
  broadcastSentAtLabel,
}: Props) {
  const t = useTranslations("Moment.broadcast");
  const [open, setOpen] = React.useState(false);
  const [customMessage, setCustomMessage] = React.useState("");
  const [isPending, setIsPending] = React.useState(false);

  const alreadySent = broadcastSentAtLabel !== null;

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={alreadySent}
          className="shrink-0 gap-1.5"
          title={alreadySent ? t("alreadySent", { date: broadcastSentAtLabel }) : undefined}
        >
          <Mail className="size-4" />
          {alreadySent ? t("alreadySentShort") : t("sendButton")}
        </Button>
      </DialogTrigger>

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
