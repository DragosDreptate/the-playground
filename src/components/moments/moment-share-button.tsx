"use client";

import posthog from "posthog-js";

import { ShareButton } from "@/components/share-button";
import type { MomentStatus } from "@/domain/models/moment";

type Props = {
  url: string;
  ariaLabel: string;
  momentId: string;
  momentSlug: string;
  circleId: string;
  circleName: string;
  momentStatus: MomentStatus;
};

export function MomentShareButton({
  url,
  ariaLabel,
  momentId,
  momentSlug,
  circleId,
  circleName,
  momentStatus,
}: Props) {
  return (
    <ShareButton
      url={url}
      ariaLabel={ariaLabel}
      onShared={() => {
        posthog.capture("moment_shared", {
          moment_id: momentId,
          moment_slug: momentSlug,
          circle_id: circleId,
          circle_name: circleName,
          moment_status: momentStatus,
        });
      }}
    />
  );
}
