"use client";

import posthog from "posthog-js";

import { ShareButton } from "@/components/share-button";

type Props = {
  url: string;
  ariaLabel: string;
  circleId: string;
  circleSlug: string;
  circleName: string;
};

export function CircleShareButton({
  url,
  ariaLabel,
  circleId,
  circleSlug,
  circleName,
}: Props) {
  return (
    <ShareButton
      url={url}
      ariaLabel={ariaLabel}
      onShared={() => {
        posthog.capture("circle_shared", {
          circle_id: circleId,
          circle_slug: circleSlug,
          circle_name: circleName,
        });
      }}
    />
  );
}
