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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { contactCircleHostsAction } from "@/app/actions/contact-hosts";
import {
  CONTACT_MESSAGE_MAX_LENGTH,
  CONTACT_MESSAGE_MIN_LENGTH,
} from "@/domain/usecases/contact-circle-hosts";
import { CONTACT_ERROR_CODES } from "@/domain/errors";

type Props = {
  circleId: string;
  /** Si fourni, l'intro de la modale parle de l'événement plutôt que de la Communauté. */
  momentId?: string;
  senderEmail: string | null;
  /** Non-null = visiteur non auth → le trigger devient un lien vers signin. */
  signInUrl: string | null;
  /**
   * Vrai = compte de moins de 24h (non-organisateur) : on anticipe le gate
   * serveur en grisant le trigger (tooltip desktop + toast au tap mobile),
   * plutôt que de laisser écrire un message refusé à l'envoi. Le gate serveur
   * reste la source de vérité.
   */
  accountTooNew?: boolean;
};

const triggerClassName =
  "group inline-flex items-center gap-1.5 py-1 text-xs font-normal text-muted-foreground hover:text-primary dark:hover:text-[oklch(0.76_0.27_341)] transition-colors";

function TriggerInner() {
  const t = useTranslations("ContactOrganizer");
  return (
    <>
      <Mail className="size-3" aria-hidden />
      {t("triggerLabel")}
    </>
  );
}

const disabledTriggerClassName =
  "inline-flex items-center gap-1.5 py-1 text-xs font-normal text-muted-foreground opacity-50 cursor-not-allowed";

export function ContactOrganizerLink({
  circleId,
  momentId,
  senderEmail,
  signInUrl,
  accountTooNew,
}: Props) {
  const t = useTranslations("ContactOrganizer");
  const [open, setOpen] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [isPending, startTransition] = React.useTransition();

  if (signInUrl) {
    return (
      <a href={signInUrl} className={triggerClassName} aria-label={t("signInToContact")}>
        <TriggerInner />
      </a>
    );
  }

  // Compte de moins de 24h : on anticipe le refus serveur. Trigger grisé,
  // explication au survol (desktop) et au tap via toast (mobile, pas de hover).
  // `aria-disabled` plutôt que `disabled` natif pour que le tap déclenche quand
  // même le toast.
  if (accountTooNew) {
    const reason = t("errorAccountTooNew");
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-disabled="true"
              className={disabledTriggerClassName}
              onClick={() => toast.info(reason)}
            >
              <TriggerInner />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{reason}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  function handleSend() {
    startTransition(async () => {
      const result = await contactCircleHostsAction({ circleId, momentId, message });
      if (result.success) {
        toast.success(t("successTitle"), { description: t("successDescription") });
        setOpen(false);
        setMessage("");
        return;
      }
      toast.error(errorMessageFor(result.code, t));
    });
  }

  const isMessageValid = message.trim().length >= CONTACT_MESSAGE_MIN_LENGTH;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className={triggerClassName}>
          <TriggerInner />
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="bg-muted border-border flex size-12 shrink-0 items-center justify-center rounded-2xl border">
              <Mail className="size-5" aria-hidden />
            </div>
            <DialogTitle>{t("title")}</DialogTitle>
          </div>
          <DialogDescription>
            {momentId ? t("descriptionEvent") : t("descriptionCircle")}
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
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
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
    case CONTACT_ERROR_CODES.ContactHostsRateLimited:
      return t("errorRateLimited");
    case CONTACT_ERROR_CODES.ContactHostsAccountTooNew:
      return t("errorAccountTooNew");
    case CONTACT_ERROR_CODES.ContactMessageTooShort:
      return t("errorTooShort", { min: CONTACT_MESSAGE_MIN_LENGTH });
    case CONTACT_ERROR_CODES.ContactMessageTooLong:
      return t("errorTooLong", { max: CONTACT_MESSAGE_MAX_LENGTH });
    case CONTACT_ERROR_CODES.NoHostsToContact:
      return t("errorNoHosts");
    default:
      return t("errorGeneric");
  }
}
