"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarSync, Check, ChevronDown, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { routing } from "@/i18n/routing";
import { GoogleCalendarIcon } from "@/components/moments/add-to-calendar-menu";

type Props = {
  circleSlug: string;
  appUrl: string;
};

const COPIED_FEEDBACK_MS = 2000;

function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.37 12.6c-.02-2.23 1.82-3.3 1.9-3.35-1.04-1.52-2.65-1.72-3.22-1.75-1.37-.14-2.68.81-3.37.81-.7 0-1.77-.79-2.9-.77-1.49.02-2.87.87-3.64 2.2-1.55 2.69-.4 6.67 1.11 8.85.74 1.07 1.62 2.27 2.77 2.22 1.11-.04 1.53-.72 2.88-.72 1.34 0 1.72.72 2.9.7 1.2-.02 1.95-1.09 2.68-2.16.84-1.24 1.19-2.44 1.21-2.5-.03-.01-2.32-.89-2.32-3.53zM14.16 6.06c.61-.74 1.03-1.77.91-2.8-.88.04-1.95.59-2.58 1.33-.57.66-1.07 1.7-.93 2.71.98.08 1.99-.5 2.6-1.24z" />
    </svg>
  );
}

/**
 * Bouton « S'abonner au calendrier » de la page Communauté publique (#647).
 * Propose un abonnement (pas un téléchargement) : l'agenda relit le flux et
 * suit les ajouts, changements et annulations.
 */
export function CircleCalendarSubscribeMenu({ circleSlug, appUrl }: Props) {
  const t = useTranslations("Circle.calendarFeed");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Dernière interaction avec le menu. À la fermeture, Radix rend le focus au
  // bouton, et le navigateur affiche alors son contour de focus même après un
  // toucher. Ce retour n'est utile qu'au clavier : on le garde pour lui seul.
  const lastInputRef = useRef<"pointer" | "keyboard">("pointer");
  const markPointer = () => {
    lastInputRef.current = "pointer";
  };
  const markKeyboard = () => {
    lastInputRef.current = "keyboard";
  };

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const localeQuery = locale === routing.defaultLocale ? "" : `?locale=${locale}`;
  const feedUrl = `${appUrl}/api/circles/${circleSlug}/calendar${localeQuery}`;
  const webcalUrl = feedUrl.replace(/^https?:\/\//, "webcal://");
  const googleUrl = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}`;

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setCopied(false);
    }
  };

  const handleCopy = async (event: Event) => {
    // Garde le menu ouvert le temps d'afficher « Lien copié ».
    event.preventDefault();
    try {
      await navigator.clipboard.writeText(feedUrl);
    } catch {
      // navigator.clipboard indisponible (HTTP, anciens navigateurs) — silencieux
      return;
    }
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => handleOpenChange(false), COPIED_FEEDBACK_MS);
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild onPointerDown={markPointer} onKeyDown={markKeyboard}>
        <Button
          variant="outline"
          size="sm"
          aria-label={t("label")}
          className="shrink-0 max-lg:size-9 max-lg:p-0"
        >
          <CalendarSync className="size-4" />
          <span className="hidden lg:inline">{t("label")}</span>
          <ChevronDown className="text-muted-foreground hidden size-3.5 lg:inline" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64"
        onPointerDown={markPointer}
        onPointerDownOutside={markPointer}
        onKeyDown={markKeyboard}
        onCloseAutoFocus={(event) => {
          if (lastInputRef.current === "pointer") event.preventDefault();
        }}
      >
        <DropdownMenuItem asChild>
          <a href={googleUrl} target="_blank" rel="noopener noreferrer">
            <GoogleCalendarIcon />
            {t("google")}
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={webcalUrl}>
            <AppleIcon />
            {t("apple")}
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={handleCopy}>
          {copied ? <Check className="size-4 text-green-500" /> : <LinkIcon className="size-4" />}
          {copied ? t("linkCopied") : t("copyLink")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <p className="text-muted-foreground px-2 py-1.5 text-xs leading-relaxed">
          {t("hint")}
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
