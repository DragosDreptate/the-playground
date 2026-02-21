export type PlaceSuggestion = {
  id: string;
  name: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
};

export interface PlacesService {
  search(query: string): Promise<PlaceSuggestion[]>;
}
