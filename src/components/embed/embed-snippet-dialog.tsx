"use client";

import { useMemo, useState } from "react";
import { Code } from "lucide-react";
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

type Locale = "fr" | "en";
type Theme = "light" | "dark";

type Props = {
  momentSlug: string;
  momentTitle: string;
  appUrl: string;
};

const EMBED_HEIGHT = 280;

export function EmbedSnippetDialog({ momentSlug, momentTitle, appUrl }: Props) {
  const t = useTranslations("EmbedWidget");
  const [locale, setLocale] = useState<Locale>("fr");
  const [theme, setTheme] = useState<Theme>("light");

  const embedUrl = `${appUrl}/embed/m/${momentSlug}?locale=${locale}&theme=${theme}`;

  const snippet = useMemo(
    () =>
      `<iframe\n  src="${embedUrl}"\n  width="100%"\n  height="${EMBED_HEIGHT}"\n  frameborder="0"\n  title="${escapeHtmlAttr(t("titleAlt", { title: momentTitle }))}"\n  loading="lazy"\n></iframe>`,
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

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-muted-foreground mb-1.5 block text-xs font-medium uppercase tracking-wider">
                {t("dashboardLabelLocale")}
              </label>
              <SegmentedControl
                value={locale}
                onChange={setLocale}
                options={[
                  { value: "fr", label: t("dashboardLocaleFr") },
                  { value: "en", label: t("dashboardLocaleEn") },
                ]}
              />
            </div>
            <div>
              <label className="text-muted-foreground mb-1.5 block text-xs font-medium uppercase tracking-wider">
                {t("dashboardLabelTheme")}
              </label>
              <SegmentedControl
                value={theme}
                onChange={setTheme}
                options={[
                  { value: "light", label: t("dashboardThemeLight") },
                  { value: "dark", label: t("dashboardThemeDark") },
                ]}
              />
            </div>
          </div>

          <div>
            <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wider">
              {t("dashboardPreviewTitle")}
            </p>
            <div className="bg-muted/30 overflow-hidden rounded-xl border p-4">
              <iframe
                key={embedUrl}
                src={embedUrl}
                width="100%"
                height={EMBED_HEIGHT}
                frameBorder={0}
                title={t("titleAlt", { title: momentTitle })}
                className="block"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                {t("dashboardSnippetTitle")}
              </p>
              <CopyButton
                value={snippet}
                label={t("dashboardCta")}
                copiedLabel={t("dashboardCopied")}
                variant="default"
                size="sm"
              />
            </div>
            <pre className="bg-muted overflow-x-auto rounded-lg p-3 text-xs leading-relaxed">
              <code>{snippet}</code>
            </pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (next: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="bg-muted inline-flex w-full rounded-lg p-0.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function escapeHtmlAttr(value: string): string {
  return value.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
