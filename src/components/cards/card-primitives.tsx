import type { LucideIcon } from "lucide-react";
import { Users } from "lucide-react";

/**
 * Primitives partagées des cartes (événement / Communauté), factorisées pour éviter
 * la duplication entre Explorer, Mon Espace et la page Communauté. Composants purs
 * (aucun hook) : utilisables aussi bien côté server que client.
 */

// Hover unifié (#597) : élévation neutre, pas de highlight rose.
// Variante `self` (la carte est elle-même le déclencheur) et `group` (déclenchée
// par un ancêtre `.group`, ex. rangée de timeline).
export const CARD_HOVER =
  "transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-xl";
export const CARD_HOVER_GROUP =
  "transition-[transform,box-shadow] duration-150 group-hover:-translate-y-0.5 group-hover:shadow-xl";

const ICON_PILL_SIZES = {
  sm: { box: "size-5 rounded-md", icon: "size-3.5" },
  md: { box: "size-6 rounded-lg", icon: "size-4" },
} as const;

/** Pastille grise contenant une icône (méta ville / heure / lieu / calendrier). */
export function IconPill({
  icon: Icon,
  size = "md",
  className,
}: {
  icon: LucideIcon;
  size?: keyof typeof ICON_PILL_SIZES;
  className?: string;
}) {
  const s = ICON_PILL_SIZES[size];
  return (
    <span
      className={`bg-foreground/10 flex ${s.box} shrink-0 items-center justify-center ${className ?? ""}`}
    >
      <Icon className={`${s.icon} text-foreground`} />
    </span>
  );
}

/** Capsule de rattachement à une Communauté (bordure + fond muted, icône optionnelle). */
export function CirclePill({
  name,
  withIcon = false,
  muted = false,
  className,
}: {
  name: string;
  withIcon?: boolean;
  muted?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex min-w-0 max-w-full items-center gap-1.5 truncate rounded-full border bg-muted/50 px-3 py-0.5 text-xs ${
        muted ? "border-foreground/10 text-muted-foreground/60" : "border-foreground/20 text-muted-foreground"
      } ${className ?? ""}`}
    >
      {withIcon && <Users className="size-3 shrink-0" />}
      <span className="truncate">{name}</span>
    </span>
  );
}
