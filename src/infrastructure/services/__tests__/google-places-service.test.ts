import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createGooglePlacesService } from "@/infrastructure/services/google-places-service";

/**
 * Adapter Google Places (recherche texte) du port PlacesService.
 * fetch est simulé : on vérifie la requête envoyée et la lecture de la réponse.
 */
describe("GooglePlacesService", () => {
  const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    warn.mockRestore();
  });

  describe("given an address Google knows", () => {
    it("should send the query with the key and return the places with their coordinates", async () => {
      const fetchMock = vi.fn(async () =>
        jsonResponse({
          places: [{
            id: "abc",
            displayName: { text: "Station F" },
            formattedAddress: "5 Parv. Alan Turing, 75013 Paris, France",
            location: { latitude: 48.83, longitude: 2.37 },
          }],
        })
      );
      vi.stubGlobal("fetch", fetchMock);

      const places = await createGooglePlacesService("key-123").search("Station F, Paris");

      expect(places).toEqual([{
        id: "abc",
        name: "Station F",
        fullAddress: "5 Parv. Alan Turing, 75013 Paris, France",
        latitude: 48.83,
        longitude: 2.37,
      }]);
      const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toBe("https://places.googleapis.com/v1/places:searchText");
      expect((init.headers as Record<string, string>)["X-Goog-Api-Key"]).toBe("key-123");
      expect(JSON.parse(init.body as string)).toMatchObject({ textQuery: "Station F, Paris" });
    });
  });

  describe("given a place without usable coordinates", () => {
    it("should leave it out, so the radar never searches around a null position", async () => {
      vi.stubGlobal("fetch", vi.fn(async () =>
        jsonResponse({
          places: [
            { id: "sans-position" },
            { id: "position-nulle", location: { latitude: null, longitude: null } },
            { id: "ok", location: { latitude: 45.76, longitude: 4.84 } },
          ],
        })
      ));

      const places = await createGooglePlacesService("key-123").search("Lyon");

      expect(places.map((p) => p.id)).toEqual(["ok"]);
    });
  });

  describe("given Google refuses the call (billing off, key restricted)", () => {
    it("should return no place and warn with the HTTP status", async () => {
      vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ error: { status: "PERMISSION_DENIED" } }, 403)));

      expect(await createGooglePlacesService("key-123").search("Paris")).toEqual([]);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("403"));
    });
  });

  describe("given no API key", () => {
    it("should not call Google and warn", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      expect(await createGooglePlacesService(undefined).search("Paris")).toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("GOOGLE_PLACES_API_KEY"));
    });
  });
});
