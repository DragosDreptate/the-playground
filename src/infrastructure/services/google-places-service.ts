import type {
  PlacesService,
  PlaceSuggestion,
} from "@/domain/ports/services/places-service";

const SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
};

const isCoordinate = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/**
 * Recherche de lieux en texte libre (adresse, ville) par l'API Places de Google,
 * celle de l'autocomplétion d'adresse : même clé, même facturation.
 * Un lieu sans coordonnées exploitables est écarté. Une erreur de l'API (clé
 * absente, facturation coupée : HTTP 403) est signalée dans les logs.
 */
export function createGooglePlacesService(apiKey: string | undefined): PlacesService {
  return {
    async search(query) {
      if (!apiKey) {
        console.warn("[places] GOOGLE_PLACES_API_KEY manquante");
        return [];
      }

      const res = await fetch(SEARCH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location",
        },
        // regionCode oriente les noms ambigus (Valence, Saint-Denis) vers la France
        // sans exclure les autres pays : sinon Google départage selon la position
        // de l'appelant, le serveur.
        body: JSON.stringify({ textQuery: query, pageSize: 5, languageCode: "fr", regionCode: "fr" }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        console.warn(`[places] Google Places : HTTP ${res.status}`);
        return [];
      }

      const data = (await res.json()) as { places?: GooglePlace[] };
      return (data.places ?? []).flatMap((place): PlaceSuggestion[] => {
        const { latitude, longitude } = place.location ?? {};
        if (!isCoordinate(latitude) || !isCoordinate(longitude)) return [];
        return [{
          id: place.id ?? "",
          name: place.displayName?.text ?? "",
          fullAddress: place.formattedAddress ?? "",
          latitude,
          longitude,
        }];
      });
    },
  };
}
