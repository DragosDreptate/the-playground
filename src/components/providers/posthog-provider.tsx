"use client";

import posthog from "posthog-js";

if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: "/ingest",
    ui_host: "https://eu.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: false,
  });
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
