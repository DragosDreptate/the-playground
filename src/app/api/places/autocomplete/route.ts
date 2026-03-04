import { NextRequest, NextResponse } from "next/server";
import type { PlaceSuggestionItem } from "@/hooks/use-place-autocomplete";

type GooglePrediction = {
  placePrediction: {
    placeId: string;
    text: { text: string };
    structuredFormat: {
      mainText: { text: string };
      secondaryText?: { text: string };
    };
  };
};

type GoogleAutocompleteResponse = {
  suggestions?: GooglePrediction[];
};

type GooglePlaceDetailsResponse = {
  location?: {
    latitude: number;
    longitude: number;
  };
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q");
  const sessionToken = searchParams.get("sessionToken");

  if (!q || q.trim().length < 3) {
    return NextResponse.json(
      { error: "Query must be at least 3 characters" },
      { status: 400 }
    );
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Google Places not configured" },
      { status: 503 }
    );
  }

  // Étape 1 : autocomplete
  const autocompleteRes = await fetch(
    "https://places.googleapis.com/v1/places:autocomplete",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
      },
      body: JSON.stringify({
        input: q.trim(),
        ...(sessionToken ? { sessionToken } : {}),
        languageCode: "fr",
      }),
    }
  );

  if (!autocompleteRes.ok) {
    return NextResponse.json(
      { error: "Google Places API error" },
      { status: autocompleteRes.status }
    );
  }

  const autocompleteData: GoogleAutocompleteResponse =
    await autocompleteRes.json();
  const predictions = autocompleteData.suggestions ?? [];

  // Étape 2 : récupérer les coordonnées pour chaque suggestion en parallèle
  const suggestions: PlaceSuggestionItem[] = await Promise.all(
    predictions.slice(0, 5).map(async (prediction) => {
      const { placeId, structuredFormat, text } =
        prediction.placePrediction;
      const mainText = structuredFormat.mainText.text;
      const fullAddress = text.text;

      // Récupérer lat/lng via Place Details
      const detailsRes = await fetch(
        `https://places.googleapis.com/v1/places/${placeId}`,
        {
          headers: {
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": "location",
          },
        }
      );

      let latitude = 0;
      let longitude = 0;

      if (detailsRes.ok) {
        const details: GooglePlaceDetailsResponse = await detailsRes.json();
        latitude = details.location?.latitude ?? 0;
        longitude = details.location?.longitude ?? 0;
      }

      return {
        id: placeId,
        name: mainText,
        fullAddress,
        latitude,
        longitude,
      };
    })
  );

  return NextResponse.json(suggestions);
}
