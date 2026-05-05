"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

type Variant = "default" | "outline" | "ghost" | "secondary";
type Size = "default" | "sm" | "lg" | "icon";

type Props = {
  value: string;
  label: string;
  copiedLabel: string;
  variant?: Variant;
  size?: Size;
};

export function CopyButton({ value, label, copiedLabel, variant = "ghost", size = "sm" }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // navigator.clipboard indisponible (HTTP, anciens navigateurs) — silencieux
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      aria-label={copied ? copiedLabel : label}
      onClick={handleCopy}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? copiedLabel : label}
    </Button>
  );
}
