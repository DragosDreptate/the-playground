"use client";

import { useEffect, useRef } from "react";
import { AUTO_JOIN_PARAM } from "@/lib/auto-join";

/**
 * Déclenche une action d'inscription une seule fois au montage si l'URL porte le
 * marqueur `?join=1` (intention mémorisée avant l'authentification) et que
 * l'inscription est possible (`enabled`).
 *
 * Le marqueur est retiré de l'URL dans TOUS les cas (déclenchement ou non) pour
 * éviter un re-déclenchement au reload et un partage involontaire de l'intention.
 *
 * Lit `window.location.search` (et non `useSearchParams`) pour ne pas imposer de
 * Suspense boundary à la page appelante.
 */
export function useAutoJoin({
  enabled,
  onTrigger,
}: {
  enabled: boolean;
  onTrigger: () => void;
}) {
  const firedRef = useRef(false);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const onTriggerRef = useRef(onTrigger);
  onTriggerRef.current = onTrigger;

  useEffect(() => {
    if (firedRef.current || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get(AUTO_JOIN_PARAM) !== "1") return;

    firedRef.current = true;
    url.searchParams.delete(AUTO_JOIN_PARAM);
    window.history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`
    );

    if (enabledRef.current) onTriggerRef.current();
  }, []);
}
