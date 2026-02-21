"use client";

import { useCallback, useRef, useState } from "react";

export type PlaceSuggestionItem = {
  id: string;
  name: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
};

const BAN_BASE = "https://api-adresse.data.gouv.fr/search";
const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 300;

type BanFeature = {
  geometry: { coordinates: [number, number] };
  properties: {
    id: string;
    label: string;
    name: string;
  };
};

export function usePlaceAutocomplete() {
  const [suggestions, setSuggestions] = useState<PlaceSuggestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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
          limit: "5",
          autocomplete: "1",
        });

        const res = await fetch(`${BAN_BASE}?${params}`, {
          signal: controller.signal,
        });

        if (!res.ok) throw new Error("BAN API error");

        const data: { features: BanFeature[] } = await res.json();

        if (!controller.signal.aborted) {
          setSuggestions(
            data.features.map((f) => ({
              id: f.properties.id,
              name: f.properties.name,
              fullAddress: f.properties.label,
              latitude: f.geometry.coordinates[1],
              longitude: f.geometry.coordinates[0],
            }))
          );
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

  return { suggestions, isLoading, suggest, clear };
}
