import Link from "next/link";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TableHead } from "@/components/ui/table";

type Props = {
  label: string;
  column: string;
  currentSort?: string;
  currentOrder?: string;
  basePath: string;
  params?: Record<string, string>;
  className?: string;
};

export function SortableTableHead({
  label,
  column,
  currentSort,
  currentOrder,
  basePath,
  params = {},
  className,
}: Props) {
  const isActive = currentSort === column;
  const nextOrder = isActive && currentOrder === "asc" ? "desc" : "asc";

  const urlParams = new URLSearchParams(params);
  urlParams.set("sort", column);
  urlParams.set("order", nextOrder);

  return (
    <TableHead className={cn("whitespace-nowrap", className)}>
      <Link
        href={`${basePath}?${urlParams.toString()}`}
        className="inline-flex items-center gap-1 select-none transition-colors hover:text-foreground"
      >
        {label}
        {isActive ? (
          currentOrder === "asc" ? (
            <ArrowUp className="size-3 shrink-0" />
          ) : (
            <ArrowDown className="size-3 shrink-0" />
          )
        ) : (
          <ArrowUpDown className="size-3 shrink-0 opacity-40" />
        )}
      </Link>
    </TableHead>
  );
}
