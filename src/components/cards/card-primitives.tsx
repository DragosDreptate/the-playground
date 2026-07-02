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

/**
 * Échafaudage de rangée de timeline (colonne date + dot avec effet loupe + ligne
 * verticale pointillée + carte). Partagé par les 3 timelines (Mon Espace, page
 * Communauté, Explorer desktop). Les parties qui diffèrent (colonne date, couleur
 * du dot, paddings) sont passées en props ; la carte est passée en `children`.
 */
export function TimelineScaffold({
  dateColumn,
  dotClass,
  isLast,
  className = "group flex gap-0",
  cardPadding = "pl-2 sm:pl-4",
  spacing = "pb-7",
  children,
}: {
  dateColumn: React.ReactNode;
  dotClass: string;
  isLast: boolean;
  className?: string;
  cardPadding?: string;
  spacing?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      {dateColumn}
      <div className="flex shrink-0 flex-col items-center">
        <div
          className={`mt-2 size-2 shrink-0 translate-y-3 rounded-full transition-transform duration-150 group-hover:scale-150 sm:translate-y-0 ${dotClass}`}
        />
        {!isLast && <div className="mt-2 flex-1 border-l border-dashed border-border" />}
      </div>
      <div className={`min-w-0 flex-1 ${cardPadding} ${isLast ? "pb-0" : spacing}`}>{children}</div>
    </div>
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

/**
 * Couleur du dot de timeline selon l'état du moment / de l'inscription. Partagé par
 * Mon Espace et la page Communauté pour éviter les divergences (ex. oubli du statut
 * « en attente de validation »). `defaultClass` encode la couleur de l'état actif,
 * qui diffère selon la surface (rose côté Host, neutre pour une inscription inactive
 * côté participant).
 */
export function momentDotClass({
  isCancelled = false,
  isPast = false,
  isDraft = false,
  isAmber = false,
  defaultClass = "bg-primary",
}: {
  isCancelled?: boolean;
  isPast?: boolean;
  isDraft?: boolean;
  isAmber?: boolean;
  defaultClass?: string;
}): string {
  if (isCancelled) return "bg-destructive/50";
  if (isPast) return "bg-border";
  if (isDraft) return "bg-muted-foreground/40";
  if (isAmber) return "bg-amber-400";
  return defaultClass;
}
