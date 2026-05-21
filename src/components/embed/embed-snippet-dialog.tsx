"use client";

import { useMemo, useState } from "react";
import { Code, Globe, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
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

type Locale = "fr" | "en";
type Theme = "light" | "dark";

type Props = {
  momentSlug: string;
  momentTitle: string;
  appUrl: string;
};

const EMBED_WIDTH = 480;
const EMBED_HEIGHT = 280;

export function EmbedSnippetDialog({ momentSlug, momentTitle, appUrl }: Props) {
  const t = useTranslations("EmbedWidget");
  const [locale, setLocale] = useState<Locale>("fr");
  const [theme, setTheme] = useState<Theme>("light");

  const embedUrl = `${appUrl}/embed/m/${momentSlug}?locale=${locale}&theme=${theme}`;

  const snippet = useMemo(
    () =>
      `<iframe\n  src="${embedUrl}"\n  width="${EMBED_WIDTH}"\n  height="${EMBED_HEIGHT}"\n  frameborder="0"\n  title="${escapeHtmlAttr(t("titleAlt", { title: momentTitle }))}"\n  loading="lazy"\n></iframe>`,
    [embedUrl, momentTitle, t]
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Code className="size-4" />
          {t("dashboardOpen")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("dashboardTitle")}</DialogTitle>
          <DialogDescription>{t("dashboardNote")}</DialogDescription>
        </DialogHeader>

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
          <ThemeDropdown
            value={theme}
            onChange={setTheme}
            ariaLabel={t("dashboardLabelTheme")}
            labels={{
              light: t("dashboardThemeLight"),
              dark: t("dashboardThemeDark"),
            }}
          />
        </div>

        <Tabs defaultValue="preview" className="min-w-0">
          <TabsList>
            <TabsTrigger value="preview">{t("dashboardPreviewTitle")}</TabsTrigger>
            <TabsTrigger value="code">{t("dashboardSnippetTitle")}</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-3 h-[320px] min-w-0">
            <div className="bg-muted/30 flex h-full items-center justify-center overflow-auto rounded-lg border p-4">
              <iframe
                key={embedUrl}
                src={embedUrl}
                width={EMBED_WIDTH}
                height={EMBED_HEIGHT}
                frameBorder={0}
                title={t("titleAlt", { title: momentTitle })}
                className="block"
              />
            </div>
          </TabsContent>

          <TabsContent value="code" className="mt-3 flex h-[320px] min-w-0 flex-col">
            <div className="mb-2 flex shrink-0 justify-end">
              <CopyButton
                value={snippet}
                label={t("dashboardCta")}
                copiedLabel={t("dashboardCopied")}
                variant="ghost"
                size="sm"
              />
            </div>
            <pre className="bg-muted min-w-0 flex-1 max-w-full overflow-auto rounded-lg p-3 text-xs leading-relaxed">
              <code>{snippet}</code>
            </pre>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function LocaleDropdown({
  value,
  onChange,
  ariaLabel,
  labels,
}: {
  value: Locale;
  onChange: (next: Locale) => void;
  ariaLabel: string;
  labels: Record<Locale, string>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs font-medium"
          aria-label={ariaLabel}
        >
          <Globe className="size-3.5" />
          {value.toUpperCase()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {(Object.keys(labels) as Locale[]).map((l) => (
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

function ThemeDropdown({
  value,
  onChange,
  ariaLabel,
  labels,
}: {
  value: Theme;
  onChange: (next: Theme) => void;
  ariaLabel: string;
  labels: Record<Theme, string>;
}) {
  const Icon = value === "dark" ? Moon : Sun;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs font-medium"
          aria-label={ariaLabel}
        >
          <Icon className="size-3.5" />
          {labels[value]}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {(Object.keys(labels) as Theme[]).map((t) => (
          <DropdownMenuItem
            key={t}
            onClick={() => onChange(t)}
            className={t === value ? "font-semibold" : ""}
          >
            {labels[t]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function escapeHtmlAttr(value: string): string {
  return value.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
