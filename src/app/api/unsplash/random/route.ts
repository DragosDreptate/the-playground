import { NextRequest, NextResponse } from "next/server";
import type { UnsplashPhoto } from "@/app/api/unsplash/search/route";
import { parsePerPage } from "../_lib/parse-per-page";

const DEFAULT_RANDOM_COUNT = 8;

type UnsplashRandomPhoto = {
  id: string;
  urls: { regular: string; thumb: string };
  user: { name: string; links: { html: string } };
};

export async function GET(request: NextRequest) {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return NextResponse.json({ error: "Unsplash not configured" }, { status: 503 });
  }

  const count = parsePerPage(
    request.nextUrl.searchParams.get("perPage"),
    DEFAULT_RANDOM_COUNT
  );

  const url = new URL("https://api.unsplash.com/photos/random");
  url.searchParams.set("count", String(count));
  url.searchParams.set("orientation", "squarish");

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Client-ID ${accessKey}` },
    // Cache 1h — ces photos servent uniquement de fallback "pas de mot-clé",
    // leur fraîcheur n'est pas critique. Un cache long protège le quota Unsplash.
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Unsplash API error" }, { status: response.status });
  }

  const data = (await response.json()) as UnsplashRandomPhoto[];

  const results: UnsplashPhoto[] = data.map((photo) => ({
    id: photo.id,
    url: photo.urls.regular,
    thumbUrl: photo.urls.thumb,
    author: {
      name: photo.user.name,
      profileUrl: photo.user.links.html,
    },
  }));

  return NextResponse.json(
    { results },
    { headers: { "Cache-Control": "public, s-maxage=3600" } }
  );
}
