"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type CopyLinkButtonProps = {
  value: string;
};

export function CopyLinkButton({ value }: CopyLinkButtonProps) {
  const t = useTranslations("Common");
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-label={copied ? t("copied") : t("copyLink")}
      className="h-8 shrink-0 gap-1.5 max-lg:w-8 max-lg:px-0 lg:px-3"
      onClick={handleCopy}
    >
      {copied ? (
        <Check className="size-3.5 text-green-500" />
      ) : (
        <Copy className="size-3.5" />
      )}
      <span className="hidden lg:inline">
        {copied ? t("copied") : t("copyLink")}
      </span>
    </Button>
  );
}
