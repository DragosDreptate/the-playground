"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Code, Globe, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { escapeHtml } from "@/lib/html";
import {
  EMBED_HEIGHT_MESSAGE_TYPE,
  EMBED_INITIAL_HEIGHT,
  EMBED_MAX_WIDTH,
} from "@/components/embed/constants";
import type { EmbedLocale, EmbedTheme } from "@/components/embed/types";

type Props = {
  momentSlug: string;
  momentTitle: string;
  appUrl: string;
};

export function EmbedSnippetDialog({ momentSlug, momentTitle, appUrl }: Props) {
  const t = useTranslations("EmbedWidget");
  const { resolvedTheme } = useTheme();
  const [locale, setLocale] = useState<EmbedLocale>("fr");
  const [theme, setTheme] = useState<EmbedTheme>("light");

  // Sync à l'ouverture: respecte un choix manuel ultérieur pendant l'usage.
  function handleOpenChange(open: boolean) {
    if (!open) return;
    if (resolvedTheme === "dark" || resolvedTheme === "light") {
      setTheme(resolvedTheme);
    }
  }

  const embedUrl = `${appUrl}/embed/m/${momentSlug}?locale=${locale}&theme=${theme}`;
  const titleAlt = t("titleAlt", { title: momentTitle });

  const snippet = useMemo(
    () =>
      buildSnippet({
        embedUrl,
        appOrigin: appUrl,
        momentSlug,
        titleAlt,
      }),
    [embedUrl, appUrl, momentSlug, titleAlt]
  );

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Code className="size-4" />
          {t("dashboardOpen")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="gap-3">
          <DialogTitle className="flex items-center gap-2.5">
            <div className="bg-primary/10 border-primary/20 flex size-[34px] shrink-0 items-center justify-center rounded-[9px] border">
              <Code className="text-primary size-[18px]" />
            </div>
            {t("dashboardTitle")}
          </DialogTitle>
          <DialogDescription>{t("dashboardNote")}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <LocaleDropdown
              value={locale}
              onChange={setLocale}
              ariaLabel={t("dashboardLabelLocale")}
              labels={{
                fr: t("dashboardLocaleFr"),
                en: t("dashboardLocaleEn"),
              }}
            />
            <ThemeToggleButton
              value={theme}
              onChange={setTheme}
              ariaLabel={t("dashboardLabelTheme")}
              labels={{
                light: t("dashboardThemeLight"),
                dark: t("dashboardThemeDark"),
              }}
            />
          </div>
          <CopyButton
            value={snippet}
            label={t("dashboardCta")}
            copiedLabel={t("dashboardCopied")}
            variant="ghost"
            size="sm"
          />
        </div>

        <Tabs defaultValue="preview" className="min-w-0">
          <TabsList className="w-full">
            <TabsTrigger value="preview">{t("dashboardPreviewTitle")}</TabsTrigger>
            <TabsTrigger value="code">{t("dashboardSnippetTitle")}</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-2 min-w-0">
            <PreviewIframe
              embedUrl={embedUrl}
              appOrigin={appUrl}
              title={titleAlt}
            />
          </TabsContent>

          <TabsContent value="code" className="mt-2 min-w-0">
            <pre
              className="bg-muted max-w-full overflow-scroll rounded-lg p-3 text-xs leading-relaxed [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:appearance-none [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-500/70 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-700/30"
              style={{ height: 320, scrollbarWidth: "thin", scrollbarColor: "rgba(100,116,139,0.7) rgba(51,65,85,0.3)" }}
            >
              <code>{snippet}</code>
            </pre>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function buildSnippet({
  embedUrl,
  appOrigin,
  momentSlug,
  titleAlt,
}: {
  embedUrl: string;
  appOrigin: string;
  momentSlug: string;
  titleAlt: string;
}): string {
  const elementId = `playground-embed-${momentSlug}`;
  const safeTitle = escapeHtml(titleAlt);
  return [
    `<iframe`,
    `  id="${elementId}"`,
    `  src="${embedUrl}"`,
    `  height="${EMBED_INITIAL_HEIGHT}"`,
    `  title="${safeTitle}"`,
    `  loading="lazy"`,
    `  style="border:0;width:100%;max-width:${EMBED_MAX_WIDTH}px"`,
    `></iframe>`,
    `<script>`,
    `(function(){`,
    `  var f=document.getElementById("${elementId}");`,
    `  if(!f) return;`,
    `  window.addEventListener("message",function(e){`,
    `    if(e.source!==f.contentWindow) return;`,
    `    if(e.origin!=="${appOrigin}") return;`,
    `    if(!e.data||e.data.type!=="${EMBED_HEIGHT_MESSAGE_TYPE}") return;`,
    `    var h=Number(e.data.height);`,
    `    if(h>0&&h!==f.offsetHeight) f.style.height=h+"px";`,
    `  });`,
    `})();`,
    `</script>`,
  ].join("\n");
}

function PreviewIframe({
  embedUrl,
  appOrigin,
  title,
}: {
  embedUrl: string;
  appOrigin: string;
  title: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [height, setHeight] = useState(EMBED_INITIAL_HEIGHT);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const iframe = iframeRef.current;
      if (!iframe || e.source !== iframe.contentWindow) return;
      if (e.origin !== appOrigin) return;
      const data = e.data as { type?: string; height?: number } | undefined;
      if (!data || data.type !== EMBED_HEIGHT_MESSAGE_TYPE) return;
      const h = Number(data.height);
      if (Number.isFinite(h) && h > 0) setHeight(h);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [appOrigin]);

  return (
    <div className="flex justify-center" style={{ minHeight: EMBED_INITIAL_HEIGHT }}>
      <iframe
        ref={iframeRef}
        key={embedUrl}
        src={embedUrl}
        width={EMBED_MAX_WIDTH}
        height={height}
        title={title}
        className="block max-w-full rounded-2xl"
        style={{ border: 0 }}
      />
    </div>
  );
}

function LocaleDropdown({
  value,
  onChange,
  ariaLabel,
  labels,
}: {
  value: EmbedLocale;
  onChange: (next: EmbedLocale) => void;
  ariaLabel: string;
  labels: Record<EmbedLocale, string>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={ariaLabel}>
          <Globe className="size-4" />
          {value.toUpperCase()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {(Object.keys(labels) as EmbedLocale[]).map((l) => (
          <DropdownMenuItem
            key={l}
            onClick={() => onChange(l)}
            className={l === value ? "font-semibold" : ""}
          >
            {labels[l]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ThemeToggleButton({
  value,
  onChange,
  ariaLabel,
  labels,
}: {
  value: EmbedTheme;
  onChange: (next: EmbedTheme) => void;
  ariaLabel: string;
  labels: Record<EmbedTheme, string>;
}) {
  const Icon = value === "dark" ? Moon : Sun;
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={ariaLabel}
      onClick={() => onChange(value === "dark" ? "light" : "dark")}
    >
      <Icon className="size-4" />
      {labels[value]}
    </Button>
  );
}
