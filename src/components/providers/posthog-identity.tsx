"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import posthog from "posthog-js";

export function PostHogIdentity() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.id) {
      posthog.identify(session.user.id, {
        email: session.user.email ?? undefined,
        name: session.user.name ?? undefined,
      });
    } else {
      posthog.reset();
    }
  }, [session?.user?.id]);

  return null;
}
