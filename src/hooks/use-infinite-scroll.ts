import { useEffect, useState } from "react";

type Options = {
  /** Active l'observer (typiquement : la modale est ouverte). */
  enabled: boolean;
  /** Reste-t-il des éléments à charger ? Si false, le sentinel n'est pas observé. */
  hasMore: boolean;
  /** Callback déclenché quand le sentinel devient visible. */
  onLoadMore: () => void;
  /** Marge déclenchant le pré-chargement (défaut 120px). */
  rootMargin?: string;
};

/**
 * Infinite scroll via IntersectionObserver, conçu pour fonctionner dans une
 * modale Radix Dialog (Portal asynchrone).
 *
 * Deux subtilités encapsulées ici :
 *
 * - Callback refs (`useState`) plutôt que `useRef` : Radix monte le
 *   DialogContent dans un Portal de manière différée. Un `useRef` ne
 *   déclencherait pas de re-run d'effect quand le node est enfin attaché.
 *
 * - `root: scrollContainer` sur l'observer : sans cette option, l'observer
 *   regarde le viewport global au lieu du conteneur scrollable de la modale.
 *   Le sentinel n'intersecte alors jamais quand on scrolle DANS la modale,
 *   et `onLoadMore` n'est jamais appelé.
 */
export function useInfiniteScroll({
  enabled,
  hasMore,
  onLoadMore,
  rootMargin = "120px",
}: Options): {
  scrollContainerRef: (node: HTMLDivElement | null) => void;
  sentinelRef: (node: HTMLDivElement | null) => void;
} {
  const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(null);
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled || !hasMore || !scrollContainer || !sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { root: scrollContainer, rootMargin },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [enabled, hasMore, onLoadMore, scrollContainer, sentinel, rootMargin]);

  return {
    scrollContainerRef: setScrollContainer,
    sentinelRef: setSentinel,
  };
}
