type Props = {
  label: string;
  size?: "sm" | "md" | "lg";
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

  // Pill homogène avec les badges overlay (CoverBadgeOverlay) — cartes Communauté
  // desktop. Fond slate + texte blanc, identique en light et dark (badge système,
  // distinct des badges de statut utilisateur à fond blanc).
  if (size === "md") {
    return (
      <span className="absolute top-2 left-2 inline-flex items-center rounded-full bg-slate-700/90 px-2.5 py-1 text-xs font-semibold leading-none text-white backdrop-blur-sm">
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
