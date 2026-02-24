"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicCircleCard } from "@/components/explorer/public-circle-card";
import { PublicMomentCard } from "@/components/explorer/public-moment-card";
import { loadMoreCirclesAction, loadMoreMomentsAction } from "@/app/actions/explorer";
import type { PublicCircle } from "@/domain/ports/repositories/circle-repository";
import type { PublicMoment } from "@/domain/ports/repositories/moment-repository";
import type { CircleCategory, CircleMemberRole } from "@/domain/models/circle";
import type { RegistrationStatus } from "@/domain/models/registration";

type CirclesProps = {
  tab: "circles";
  initialItems: PublicCircle[];
  initialHasMore: boolean;
  membershipRoleMap: Record<string, CircleMemberRole>;
  category?: CircleCategory;
};

type MomentsProps = {
  tab: "moments";
  initialItems: PublicMoment[];
  initialHasMore: boolean;
  registrationStatusMap: Record<string, RegistrationStatus | null>;
  membershipBySlug: Record<string, CircleMemberRole>;
  category?: CircleCategory;
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

  function handleLoadMore() {
    startTransition(async () => {
      if (props.tab === "circles") {
        const result = await loadMoreCirclesAction({
          offset: circleItems.length,
          category: props.category,
        });
        setCircleItems((prev) => [...prev, ...result.circles]);
        setHasMore(result.hasMore);
        setCircleMembershipMap((prev) => ({ ...prev, ...result.membershipRoleMap }));
      } else {
        const result = await loadMoreMomentsAction({
          offset: momentItems.length,
          category: props.category,
        });
        setMomentItems((prev) => [...prev, ...result.moments]);
        setHasMore(result.hasMore);
        setRegistrationStatusMap((prev) => ({ ...prev, ...result.registrationStatusMap }));
        setMembershipBySlug((prev) => ({ ...prev, ...result.membershipBySlug }));
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {props.tab === "circles"
          ? circleItems.map((circle) => (
              <PublicCircleCard
                key={circle.id}
                circle={circle}
                membershipRole={circleMembershipMap[circle.id] ?? null}
              />
            ))
          : momentItems.map((moment) => (
              <PublicMomentCard
                key={moment.id}
                moment={moment}
                registrationStatus={registrationStatusMap[moment.id] ?? null}
                isOrganizer={membershipBySlug[moment.circle.slug] === "HOST"}
              />
            ))}
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={isPending}
            className="min-w-32"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              t("loadMore")
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
