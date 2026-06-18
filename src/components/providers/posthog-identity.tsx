"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import posthog from "posthog-js";
import {
  clearLastIdentifiedUserId,
  decideIdentityAction,
  isSignupTracked,
  markSignupTracked,
  readLastIdentifiedUserId,
  writeLastIdentifiedUserId,
} from "@/lib/posthog-identity-logic";

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
        // (Ré)identification à chaque render : idempotent côté PostHog, garde
        // les propriétés (email, name) fraîches.
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
    // est présent.
    if (session?.user?.id && session.user.isNewUser && !trackedRef.current) {
      if (!isSignupTracked(session.user.id)) {
        posthog.capture("user_signed_up");
        markSignupTracked(session.user.id);
      }
      trackedRef.current = true;
    }
  }, [session?.user?.id, session?.user?.isNewUser, status]);

  return null;
}
