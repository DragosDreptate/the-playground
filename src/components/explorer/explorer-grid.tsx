"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommunityCard } from "@/components/circles/community-card";
import { PublicMomentCard } from "@/components/explorer/public-moment-card";
import { loadMoreCirclesAction, loadMoreMomentsAction } from "@/app/actions/explorer";
import type { PublicCircle, ExplorerSortBy } from "@/domain/ports/repositories/circle-repository";
import type { PublicMoment } from "@/domain/ports/repositories/moment-repository";
import type { CircleCategory, CircleMemberRole } from "@/domain/models/circle";

type CirclesProps = {
  tab: "circles";
  initialItems: PublicCircle[];
  initialHasMore: boolean;
  membershipRoleMap: Record<string, CircleMemberRole>;
  category?: CircleCategory;
  sortBy?: ExplorerSortBy;
};

type MomentsProps = {
  tab: "moments";
  initialItems: PublicMoment[];
  initialHasMore: boolean;
  category?: CircleCategory;
  sortBy?: ExplorerSortBy;
};

type Props = CirclesProps | MomentsProps;

export function ExplorerGrid(props: Props) {
  const t = useTranslations("Explorer");
  const [isPending, startTransition] = useTransition();

  const [circleItems, setCircleItems] = useState<PublicCircle[]>(
    props.tab === "circles" ? props.initialItems : []
  );
  const [momentItems, setMomentItems] = useState<PublicMoment[]>(
    props.tab === "moments" ? props.initialItems : []
  );
  const [hasMore, setHasMore] = useState(props.initialHasMore);

  const [circleMembershipMap, setCircleMembershipMap] = useState<Record<string, CircleMemberRole>>(
    props.tab === "circles" ? props.membershipRoleMap : {}
  );

  // Garde SYNCHRONE : `isPending` ne bascule qu'au render suivant, donc un observer
  // et un clic tombant dans la même frame passeraient tous deux. Le ref bloque le
  // 2e appel immédiatement → pas de double fetch au même offset (doublons / clé React).
  const loadingRef = useRef(false);

  function handleLoadMore() {
    if (loadingRef.current) return;
    loadingRef.current = true;
    startTransition(async () => {
      try {
        if (props.tab === "circles") {
          const result = await loadMoreCirclesAction({
            offset: circleItems.length,
            category: props.category,
            sortBy: props.sortBy,
          });
          setCircleItems((prev) => [...prev, ...result.circles]);
          setHasMore(result.hasMore);
          setCircleMembershipMap((prev) => ({ ...prev, ...result.membershipRoleMap }));
        } else {
          const result = await loadMoreMomentsAction({
            offset: momentItems.length,
            category: props.category,
            sortBy: props.sortBy,
          });
          setMomentItems((prev) => [...prev, ...result.moments]);
          setHasMore(result.hasMore);
        }
      } finally {
        loadingRef.current = false;
      }
    });
  }

  // Chargement progressif au défilement sur les DEUX onglets (Communautés et
  // Événements), EN PLUS du bouton « Voir plus » (fallback clavier/lecteur d'écran et
  // grand écran). `ExplorerGrid` étant instancié une fois par onglet, `props.tab` est
  // constant : l'observer ne dépend que de `hasMore`. Il appelle la version courante
  // de handleLoadMore via une ref (pas de recréation par append → pas de cascade) ;
  // le guard `loadingRef` évite les appels concurrents.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef(handleLoadMore);
  loadMoreRef.current = handleLoadMore;
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMoreRef.current();
      },
      { rootMargin: "300px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore]);

  return (
    <div className="space-y-6">
      {props.tab === "circles" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {circleItems.map((circle) => (
            <CommunityCard
              key={circle.id}
              variant="public"
              circle={circle}
              membershipRole={circleMembershipMap[circle.id] ?? null}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col">
          {momentItems.map((moment, i) => (
            <PublicMomentCard
              key={moment.id}
              moment={moment}
              isLast={i === momentItems.length - 1}
            />
          ))}
        </div>
      )}

      {hasMore && (
        // Bouton « Voir plus » focusable (toujours utilisable au clavier/lecteur
        // d'écran). Le wrapper sert aussi de sentinel observé pour le chargement
        // progressif au défilement (les deux onglets).
        <div ref={sentinelRef} className="flex justify-center py-2">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={isPending}
            className="min-w-32"
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : t("loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}
