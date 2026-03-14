type Props = {
  label: string;
  size?: "sm" | "lg";
  inline?: boolean;
};

export function DemoBadge({ label, size = "sm", inline = false }: Props) {
  if (inline) {
    return (
      <span className="inline-flex items-center rounded border border-primary/70 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-primary">
        {label}
      </span>
    );
  }

  if (size === "lg") {
    return (
      <span className="absolute top-3 left-3 rounded-md border border-primary/70 bg-black/80 px-2.5 py-1 text-sm leading-none text-primary">
        {label}
      </span>
    );
  }

  return (
    <span className="absolute top-1.5 left-1.5 rounded-md border border-primary/70 bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-primary">
      {label}
    </span>
  );
}
