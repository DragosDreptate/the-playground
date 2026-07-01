import { Link } from "@/i18n/navigation";
import type { LucideIcon } from "lucide-react";
import { CARD_HOVER } from "@/components/cards/card-primitives";

/**
 * Carte « fantôme » du dashboard : bloc en pointillés (rounded-2xl) avec icône
 * optionnelle, titre et sous-titre. Langage visuel commun à la carte de
 * remplissage de la grille Communautés ET aux états vides des onglets Événements
 * et Communautés. Cliquable (Link + élévation au survol via CARD_HOVER) si `href`,
 * sinon bloc statique. Le `className` porte le display et la mise en page
 * (ex. `flex h-full p-6` en grille, `flex py-12` en état vide).
 */
export function DashboardGhostCard({
  icon: Icon,
  title,
  subtitle,
  href,
  className = "",
}: {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  href?: string;
  className?: string;
}) {
  const content = (
    <>
      {Icon && (
        <Icon className="text-muted-foreground group-hover:text-foreground mb-1 size-7 transition-colors" />
      )}
      <p className="text-sm font-semibold leading-snug">{title}</p>
      {subtitle && <p className="text-muted-foreground text-xs leading-snug">{subtitle}</p>}
    </>
  );

  const base = `group flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/40 text-center ${className}`;

  return href ? (
    <Link href={href} className={`${base} ${CARD_HOVER}`}>
      {content}
    </Link>
  ) : (
    <div className={base}>{content}</div>
  );
}
