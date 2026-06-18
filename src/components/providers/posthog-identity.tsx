"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import posthog from "posthog-js";
import {
  clearLastIdentifiedUserId,
  decideIdentityAction,
  readLastIdentifiedUserId,
  writeLastIdentifiedUserId,
} from "./posthog-identity-logic";

const SIGNUP_TRACKED_PREFIX = "ph_signup_tracked_";

export function PostHogIdentity() {
  const { data: session, status } = useSession();
  const trackedRef = useRef(false);

  useEffect(() => {
    // Session pas encore résolue : ne rien faire pour éviter de réagir à un
    // état transitoire.
    if (status === "loading") return;

    const currentUserId = session?.user?.id ?? null;
    const action = decideIdentityAction(currentUserId, readLastIdentifiedUserId());

    switch (action.type) {
      case "identify":
        posthog.identify(action.userId, {
          email: session?.user?.email ?? undefined,
          name: session?.user?.name ?? undefined,
        });
        writeLastIdentifiedUserId(action.userId);
        break;
      case "reset":
        // Vraie déconnexion uniquement (identifié -> anonyme).
        posthog.reset();
        clearLastIdentifiedUserId();
        trackedRef.current = false;
        break;
      case "none":
        break;
    }

    // Tracking nouvel utilisateur — côté client pour fiabilité en serverless.
    // Découplé de la décision d'identité : doit rester évalué dès que l'utilisateur
    // est présent, même si `identify` n'a pas été (re)déclenché ce render.
    if (session?.user?.id && session.user.isNewUser && !trackedRef.current) {
      const storageKey = `${SIGNUP_TRACKED_PREFIX}${session.user.id}`;
      if (!localStorage.getItem(storageKey)) {
        posthog.capture("user_signed_up");
        localStorage.setItem(storageKey, "1");
      }
      trackedRef.current = true;
    }
  }, [session?.user?.id, session?.user?.isNewUser, status]);

  return null;
}
