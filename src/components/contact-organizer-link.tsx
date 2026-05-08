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
import { contactCircleHostsAction } from "@/app/actions/contact-hosts";
import {
  CONTACT_MESSAGE_MAX_LENGTH,
  CONTACT_MESSAGE_MIN_LENGTH,
} from "@/domain/usecases/contact-circle-hosts";

type Props = {
  circleId: string;
  /** Si fourni, restreint le contexte à un événement précis. */
  momentId?: string;
  /** Email du Participant — affiché dans la note "reply-to". Null si non auth. */
  senderEmail: string | null;
  /** Non-null = utilisateur non authentifié, le trigger devient un lien vers signin. */
  signInUrl: string | null;
  /** Adapte le texte d'intro de la modale au contexte d'origine. */
  variant: "event" | "circle";
};

const triggerClassName =
  "group inline-flex items-center gap-1.5 py-1 text-xs font-normal text-muted-foreground hover:text-primary dark:hover:text-[oklch(0.76_0.27_341)] transition-colors";

export function ContactOrganizerLink({
  circleId,
  momentId,
  senderEmail,
  signInUrl,
  variant,
}: Props) {
  const t = useTranslations("ContactOrganizer");
  const [open, setOpen] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [isPending, setIsPending] = React.useState(false);

  if (signInUrl) {
    return (
      <a href={signInUrl} className={triggerClassName} aria-label={t("signInToContact")}>
        <Mail className="size-3" aria-hidden />
        {t("triggerLabel")}
      </a>
    );
  }

  async function handleSend() {
    setIsPending(true);
    try {
      const result = await contactCircleHostsAction({
        circleId,
        momentId,
        message,
      });
      if (result.success) {
        toast.success(t("successTitle"), { description: t("successDescription") });
        setOpen(false);
        setMessage("");
        return;
      }
      const errorMessage = errorMessageFor(result.code, t);
      toast.error(errorMessage);
    } finally {
      setIsPending(false);
    }
  }

  const trimmedLength = message.trim().length;
  const isMessageValid =
    trimmedLength >= CONTACT_MESSAGE_MIN_LENGTH &&
    trimmedLength <= CONTACT_MESSAGE_MAX_LENGTH;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className={triggerClassName}>
          <Mail className="size-3" aria-hidden />
          {t("triggerLabel")}
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="bg-muted border-border mb-2 flex size-12 items-center justify-center rounded-2xl border">
            <Mail className="size-5" aria-hidden />
          </div>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {variant === "event" ? t("descriptionEvent") : t("descriptionCircle")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="contact-organizer-message" className="sr-only">
            {t("messageLabel")}
          </Label>
          <Textarea
            id="contact-organizer-message"
            placeholder={t("messagePlaceholder")}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            maxLength={CONTACT_MESSAGE_MAX_LENGTH}
            disabled={isPending}
            autoFocus
          />
          {senderEmail && (
            <p className="text-muted-foreground text-xs leading-relaxed">
              {t("replyToNote", { email: senderEmail })}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            {t("cancel")}
          </Button>
          <Button onClick={handleSend} disabled={isPending || !isMessageValid}>
            {isPending ? t("sending") : t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function errorMessageFor(
  code: string,
  t: ReturnType<typeof useTranslations<"ContactOrganizer">>
): string {
  switch (code) {
    case "CONTACT_HOSTS_RATE_LIMITED":
      return t("errorRateLimited");
    case "CONTACT_MESSAGE_TOO_SHORT":
      return t("errorTooShort", { min: CONTACT_MESSAGE_MIN_LENGTH });
    case "CONTACT_MESSAGE_TOO_LONG":
      return t("errorTooLong", { max: CONTACT_MESSAGE_MAX_LENGTH });
    case "NO_HOSTS_TO_CONTACT":
      return t("errorNoHosts");
    default:
      return t("errorGeneric");
  }
}
