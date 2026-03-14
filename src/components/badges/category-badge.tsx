import { Tag } from "lucide-react";

type Props = {
  label: string;
  className?: string;
};

export function CategoryBadge({ label, className }: Props) {
  return (
    <span className={`flex items-center gap-1 text-muted-foreground text-xs${className ? ` ${className}` : ""}`}>
      <Tag className="size-3 shrink-0" />
      {label}
    </span>
  );
}
