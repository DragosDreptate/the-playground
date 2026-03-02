"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

type Props = {
  circleId: string;
  circleSlug: string;
  circleName: string;
  visibility: string;
  memberCount: number;
};

export function CircleViewTracker({ circleId, circleSlug, circleName, visibility, memberCount }: Props) {
  useEffect(() => {
    posthog.capture("circle_viewed", {
      circle_id: circleId,
      circle_slug: circleSlug,
      circle_name: circleName,
      visibility,
      member_count: memberCount,
    });
  }, [circleId]);

  return null;
}
