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
import type { RegistrationStatus } from "@/domain/models/registration";

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
  registrationStatusMap: Record<string, RegistrationStatus | null>;
  membershipBySlug: Record<string, CircleMemberRole>;
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
  const [registrationStatusMap, setRegistrationStatusMap] = useState<Record<string, RegistrationStatus | null>>(
    props.tab === "moments" ? props.registrationStatusMap : {}
  );
  const [membershipBySlug, setMembershipBySlug] = useState<Record<string, CircleMemberRole>>(
    props.tab === "moments" ? props.membershipBySlug : {}
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
          setRegistrationStatusMap((prev) => ({ ...prev, ...result.registrationStatusMap }));
          setMembershipBySlug((prev) => ({ ...prev, ...result.membershipBySlug }));
        }
      } finally {
        loadingRef.current = false;
      }
    });
  }

  // Onglet Communautés : chargement progressif au défilement EN PLUS du bouton
  // « Voir plus » (fallback clavier/lecteur d'écran et grand écran). L'observer
  // est créé une seule fois par état (tab/hasMore) et appelle la version courante
  // de handleLoadMore via une ref — pas de recréation par append, donc pas de
  // cascade d'auto-chargements. Le guard `loadingRef` évite les appels concurrents.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef(handleLoadMore);
  loadMoreRef.current = handleLoadMore;
  useEffect(() => {
    if (props.tab !== "circles" || !hasMore) return;
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
  }, [props.tab, hasMore]);

  return (
    <div className="space-y-6">
      {props.tab === "circles" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
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
        <div className="flex flex-col gap-2 sm:gap-0">
          {momentItems.map((moment, i) => (
            <PublicMomentCard
              key={moment.id}
              moment={moment}
              registrationStatus={registrationStatusMap[moment.id] ?? null}
              isOrganizer={membershipBySlug[moment.circle.slug] === "HOST"}
              isLast={i === momentItems.length - 1}
            />
          ))}
        </div>
      )}

      {hasMore && (
        // Bouton « Voir plus » focusable (toujours utilisable au clavier/lecteur
        // d'écran). Pour les Communautés, le wrapper sert aussi de sentinel observé
        // pour le chargement progressif au défilement.
        <div
          ref={props.tab === "circles" ? sentinelRef : undefined}
          className="flex justify-center py-2"
        >
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
