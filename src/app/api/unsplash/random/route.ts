import { NextResponse } from "next/server";
import type { UnsplashPhoto } from "@/app/api/unsplash/search/route";

// 1 requête par thématique Circle — fetched en parallèle
const THEME_QUERIES = [
  "technology",
  "design studio",
  "business meeting",
  "fitness sport",
  "art painting",
  "science laboratory",
  "community people",
  "nature landscape",
];

export async function GET() {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return NextResponse.json({ error: "Unsplash not configured" }, { status: 503 });
  }

  const results = await Promise.all(
    THEME_QUERIES.map(async (query) => {
      const url = new URL("https://api.unsplash.com/photos/random");
      url.searchParams.set("query", query);
      url.searchParams.set("orientation", "squarish");

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Client-ID ${accessKey}` },
        next: { revalidate: 300 }, // cache 5 min côté serveur
      });

      if (!res.ok) return null;

      const photo = await res.json();
      return {
        id: photo.id,
        url: photo.urls.regular,
        thumbUrl: photo.urls.thumb,
        author: {
          name: photo.user.name,
          profileUrl: photo.user.links.html,
        },
      } as UnsplashPhoto;
    })
  );

  return NextResponse.json(
    { results: results.filter(Boolean) },
    { headers: { "Cache-Control": "public, s-maxage=300" } }
  );
}
