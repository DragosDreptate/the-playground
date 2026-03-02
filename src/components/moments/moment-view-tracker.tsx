"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

type Props = {
  momentId: string;
  momentSlug: string;
  circleId: string;
  circleName: string;
  status: string;
};

export function MomentViewTracker({ momentId, momentSlug, circleId, circleName, status }: Props) {
  useEffect(() => {
    posthog.capture("moment_viewed", {
      moment_id: momentId,
      moment_slug: momentSlug,
      circle_id: circleId,
      circle_name: circleName,
      moment_status: status,
    });
  }, [momentId]);

  return null;
}
