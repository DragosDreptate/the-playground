"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: "/ingest",
      ui_host: "https://eu.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: false,
      capture_pageleave: true,
      autocapture: false,
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
