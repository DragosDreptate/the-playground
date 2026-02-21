import type {
  PlacesService,
  PlaceSuggestion,
} from "@/domain/ports/services/places-service";

const BAN_BASE = "https://api-adresse.data.gouv.fr/search";

type BanFeature = {
  geometry: { coordinates: [number, number] };
  properties: {
    id: string;
    label: string;
    name: string;
  };
};

export function createBanPlacesService(): PlacesService {
  return {
    async search(query) {
      const params = new URLSearchParams({
        q: query,
        limit: "5",
        autocomplete: "1",
      });

      const res = await fetch(`${BAN_BASE}?${params}`);
      if (!res.ok) return [];

      const data: { features: BanFeature[] } = await res.json();
      return data.features.map(
        (f): PlaceSuggestion => ({
          id: f.properties.id,
          name: f.properties.name,
          fullAddress: f.properties.label,
          latitude: f.geometry.coordinates[1],
          longitude: f.geometry.coordinates[0],
        })
      );
    },
  };
}
