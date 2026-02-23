import { NextRequest, NextResponse } from "next/server";

export type UnsplashPhoto = {
  id: string;
  url: string;
  thumbUrl: string;
  author: {
    name: string;
    profileUrl: string;
  };
};

type UnsplashSearchResponse = {
  results: UnsplashPhoto[];
  total: number;
  totalPages: number;
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q");

  if (!q || q.trim().length < 2) {
    return NextResponse.json(
      { error: "Query must be at least 2 characters" },
      { status: 400 }
    );
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return NextResponse.json(
      { error: "Unsplash not configured" },
      { status: 503 }
    );
  }

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", q.trim());
  url.searchParams.set("orientation", "squarish");
  url.searchParams.set("per_page", "12");
  url.searchParams.set("page", String(page));

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
    },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "Unsplash API error" },
      { status: response.status }
    );
  }

  const data = await response.json();

  const results: UnsplashPhoto[] = (data.results ?? []).map(
    (photo: {
      id: string;
      urls: { regular: string; thumb: string };
      user: { name: string; links: { html: string } };
    }) => ({
      id: photo.id,
      url: photo.urls.regular,
      thumbUrl: photo.urls.thumb,
      author: {
        name: photo.user.name,
        profileUrl: photo.user.links.html,
      },
    })
  );

  const result: UnsplashSearchResponse = {
    results,
    total: data.total ?? 0,
    totalPages: data.total_pages ?? 0,
  };

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, s-maxage=3600",
    },
  });
}
