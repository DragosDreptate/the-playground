"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import posthog from "posthog-js";

const SIGNUP_TRACKED_PREFIX = "ph_signup_tracked_";

export function PostHogIdentity() {
  const { data: session } = useSession();
  const trackedRef = useRef(false);

  useEffect(() => {
    if (session?.user?.id) {
      posthog.identify(session.user.id, {
        email: session.user.email ?? undefined,
        name: session.user.name ?? undefined,
      });

      // Tracking nouvel utilisateur — côté client pour fiabilité en serverless
      if (session.user.isNewUser && !trackedRef.current) {
        const storageKey = `${SIGNUP_TRACKED_PREFIX}${session.user.id}`;
        if (!localStorage.getItem(storageKey)) {
          posthog.capture("user_signed_up");
          localStorage.setItem(storageKey, "1");
        }
        trackedRef.current = true;
      }
    } else {
      posthog.reset();
    }
  }, [session?.user?.id, session?.user?.isNewUser]);

  return null;
}
