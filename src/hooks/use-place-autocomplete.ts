"use client";

import { useCallback, useRef, useState } from "react";

export type PlaceSuggestionItem = {
  id: string;
  name: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
};

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 300;

function generateSessionToken(): string {
  return crypto.randomUUID();
}

export function usePlaceAutocomplete() {
  const [suggestions, setSuggestions] = useState<PlaceSuggestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sessionTokenRef = useRef<string>(generateSessionToken());

  const suggest = useCallback((query: string) => {
    // Cancel pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Cancel in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    if (query.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const params = new URLSearchParams({
          q: query,
          sessionToken: sessionTokenRef.current,
        });

        const res = await fetch(`/api/places/autocomplete?${params}`, {
          signal: controller.signal,
        });

        if (!res.ok) throw new Error("Places API error");

        const data: PlaceSuggestionItem[] = await res.json();

        if (!controller.signal.aborted) {
          setSuggestions(data);
          setIsLoading(false);
        }
      } catch {
        if (!abortRef.current?.signal.aborted) {
          setSuggestions([]);
          setIsLoading(false);
        }
      }
    }, DEBOUNCE_MS);
  }, []);

  const clear = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setSuggestions([]);
    setIsLoading(false);
  }, []);

  // Reset session token après sélection (économie de quota Google)
  const resetSession = useCallback(() => {
    sessionTokenRef.current = generateSessionToken();
  }, []);

  return { suggestions, isLoading, suggest, clear, resetSession };
}
