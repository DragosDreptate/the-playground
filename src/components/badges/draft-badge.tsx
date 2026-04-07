import { FileEdit } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Props = {
  label: string;
  /** "cover" → overlay on image (matches DemoBadge size="lg" + FileEdit icon)
   *  "badge" → inline Badge component for card lists (default) */
  variant?: "cover" | "badge";
};

export function DraftBadge({ label, variant = "badge" }: Props) {
  if (variant === "cover") {
    return (
      <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-md border border-primary/70 bg-black/80 px-2.5 py-1 text-sm leading-none text-primary">
        <FileEdit className="size-3.5" />
        {label}
      </span>
    );
  }

  return (
    <Badge variant="outline" className="shrink-0 gap-1 border-primary/40 text-xs text-primary">
      <FileEdit className="size-3" />
      <span className="hidden sm:inline">{label}</span>
    </Badge>
  );
}
