// --- Types ---

export type EventResult = {
  title: string;
  date: string;
  time: string | null;
  location: string | null;
  url: string;
  source: string;
  description: string | null;
};

// --- Luma API — traitement 100% côté serveur, 0 token Claude ---

export const LUMA_CITY: Record<string, string> = {
  paris: "Paris", lyon: "Lyon", bordeaux: "Bordeaux", marseille: "Marseille",
  toulouse: "Toulouse", nantes: "Nantes", lille: "Lille", strasbourg: "Strasbourg",
  london: "London", berlin: "Berlin", amsterdam: "Amsterdam",
};

// Termes de localisation acceptables par ville (insensible à la casse)
export const LUMA_LOCATION_TERMS: Record<string, string[]> = {
  paris: ["paris", "île-de-france", "ile-de-france"],
  lyon: ["lyon", "auvergne"],
  bordeaux: ["bordeaux", "gironde"],
  marseille: ["marseille", "bouches-du-rhône", "bouches-du-rhone"],
  toulouse: ["toulouse", "haute-garonne"],
  nantes: ["nantes", "loire-atlantique"],
  lille: ["lille", "nord"],
  strasbourg: ["strasbourg", "bas-rhin", "alsace"],
  london: ["london"],
  berlin: ["berlin"],
  amsterdam: ["amsterdam"],
};

type LumaEntry = {
  event: {
    name: string;
    start_at: string;
    url: string;
    location_type?: string;
    geo_address_info?: { city_state?: string };
  };
  calendar?: { name?: string };
  featured_city?: { slug?: string; name?: string } | null;
};

export async function fetchAndFilterLumaEvents(
  ville: string,
  keywords: string,
  dateFrom: string,
  dateEnd: string
): Promise<EventResult[]> {
  try {
    const params = new URLSearchParams({ near: LUMA_CITY[ville.toLowerCase()] ?? ville, pagination_limit: "50" });
    if (keywords) params.set("query", keywords);
    const res = await fetch(`https://api.lu.ma/discover/get-paginated-events?${params}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];

    const json = (await res.json()) as { entries?: LumaEntry[] };
    const locationTerms = LUMA_LOCATION_TERMS[ville.toLowerCase()] ?? [ville.toLowerCase()];

    return (json.entries ?? [])
      .filter((e) => {
        const d = e.event.start_at.slice(0, 10);
        if (d < dateFrom || d > dateEnd) return false;
        const featuredSlug = e.featured_city?.slug?.toLowerCase() ?? "";
        const villeKey = ville.toLowerCase();
        if (featuredSlug && (featuredSlug === villeKey || featuredSlug === LUMA_CITY[villeKey]?.toLowerCase())) return true;
        const loc = e.event.geo_address_info?.city_state?.toLowerCase();
        if (loc) return locationTerms.some((t) => loc.includes(t));
        if (e.event.location_type !== "offline") return true;
        return false;
      })
      .map((e) => ({
        title: e.event.name,
        date: e.event.start_at.slice(0, 10),
        time: e.event.start_at.slice(11, 16) || null,
        location: e.event.geo_address_info?.city_state ?? null,
        url: `https://lu.ma/${e.event.url}`,
        source: "luma",
        description: e.calendar?.name ?? null,
      }));
  } catch {
    return [];
  }
}

// --- Eventbrite — scraping JSON-LD, 0 token Claude ---

export const EVENTBRITE_LOCATION: Record<string, string> = {
  paris: "france--paris", lyon: "france--lyon", bordeaux: "france--bordeaux",
  marseille: "france--marseille", toulouse: "france--toulouse", nantes: "france--nantes",
  lille: "france--lille", strasbourg: "france--strasbourg",
  london: "united-kingdom--london", berlin: "germany--berlin", amsterdam: "netherlands--amsterdam",
};

export const EVENTBRITE_COUNTRY: Record<string, string> = {
  paris: "fr", lyon: "fr", bordeaux: "fr", marseille: "fr",
  toulouse: "fr", nantes: "fr", lille: "fr", strasbourg: "fr",
  london: "gb", berlin: "de", amsterdam: "nl",
};

export function buildEventbriteUrl(ville: string, dateFrom: string, dateEnd: string, keywords: string): string {
  const location = EVENTBRITE_LOCATION[ville.toLowerCase()] ?? `france--${ville.toLowerCase()}`;
  const params = new URLSearchParams({ start_date: dateFrom, end_date: dateEnd });
  if (keywords) params.set("q", keywords);
  return `https://www.eventbrite.fr/d/${location}/events/?${params}`;
}

type EventbriteJsonLd = {
  "@type"?: string;
  name?: string;
  startDate?: string;
  url?: string;
  location?: { name?: string; address?: { addressLocality?: string; addressRegion?: string; addressCountry?: string } };
  eventAttendanceMode?: string;
  description?: string;
};

function extractAndFilterEventbriteEvents(
  html: string,
  dateFrom: string,
  dateEnd: string,
  locationTerms: string[],
  expectedCountry: string,
  keywords: string
): EventResult[] {
  const blocks: string[] = [];
  html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi, (_, b) => {
    blocks.push(b);
    return "";
  });

  const kwList = keywords ? keywords.toLowerCase().split(/[\s,]+/).filter(Boolean) : [];
  const events: EventResult[] = [];

  for (const block of blocks) {
    try {
      const data = JSON.parse(block) as EventbriteJsonLd | EventbriteJsonLd[];
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item["@type"] !== "Event" || !item.startDate || !item.url) continue;
        const date = item.startDate.slice(0, 10);
        if (date < dateFrom || date > dateEnd) continue;
        const isOnline = item.eventAttendanceMode?.includes("Online") || item.eventAttendanceMode?.includes("Mixed");
        const country = item.location?.address?.addressCountry?.toLowerCase() ?? "";
        const locality = item.location?.address?.addressLocality?.toLowerCase() ?? "";
        const region = item.location?.address?.addressRegion?.toLowerCase() ?? "";
        const locText = `${locality} ${region}`;
        if (!isOnline) {
          if (country && country !== expectedCountry) continue;
          if (locality && !locationTerms.some((t) => locText.includes(t))) continue;
        }
        if (kwList.length > 0) {
          const text = (item.name ?? "").toLowerCase();
          if (!kwList.some((kw) => text.includes(kw))) continue;
        }
        events.push({
          title: item.name ?? "Sans titre",
          date,
          time: item.startDate.slice(11, 16) || null,
          location: item.location?.name !== "TBD" ? (item.location?.address?.addressLocality ?? null) : null,
          url: item.url,
          source: "eventbrite",
          description: item.description ? item.description.slice(0, 150) : null,
        });
      }
    } catch { /* bloc JSON-LD invalide */ }
  }

  return events;
}

export async function fetchAndFilterEventbriteEvents(
  url: string,
  dateFrom: string,
  dateEnd: string,
  locationTerms: string[],
  expectedCountry: string,
  keywords: string
): Promise<EventResult[]> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    return extractAndFilterEventbriteEvents(await res.text(), dateFrom, dateEnd, locationTerms, expectedCountry, keywords);
  } catch {
    return [];
  }
}

// --- Mobilizon — API GraphQL publique, 0 token Claude ---

type MobilizonEvent = {
  title: string;
  beginsOn: string;
  url: string;
  physicalAddress?: { locality?: string | null; country?: string | null } | null;
};

export async function fetchAndFilterMobilizonEvents(
  ville: string,
  keywords: string,
  dateFrom: string,
  dateEnd: string
): Promise<EventResult[]> {
  const locationTerms = LUMA_LOCATION_TERMS[ville.toLowerCase()] ?? [ville.toLowerCase()];
  const kwList = keywords ? keywords.toLowerCase().split(/[\s,]+/).filter(Boolean) : [];

  const query = `{
    searchEvents(
      term: ${JSON.stringify(keywords || "")}
      beginsOn: "${dateFrom}T00:00:00Z"
      endsOn: "${dateEnd}T23:59:59Z"
      limit: 50
    ) {
      elements {
        title
        beginsOn
        url
        physicalAddress { locality country }
      }
    }
  }`;

  try {
    const res = await fetch("https://mobilizon.fr/api", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];

    const json = (await res.json()) as { data?: { searchEvents?: { elements?: MobilizonEvent[] } } };
    const elements = json.data?.searchEvents?.elements ?? [];

    return elements
      .filter((e) => {
        const locality = e.physicalAddress?.locality?.toLowerCase() ?? "";
        if (locality && !locationTerms.some((t) => locality.includes(t))) return false;
        if (kwList.length > 0) {
          const text = e.title.toLowerCase();
          if (!kwList.some((kw) => text.includes(kw))) return false;
        }
        return true;
      })
      .map((e) => ({
        title: e.title,
        date: e.beginsOn.slice(0, 10),
        time: e.beginsOn.slice(11, 16) || null,
        location: e.physicalAddress?.locality ?? null,
        url: e.url,
        source: "mobilizon",
        description: null,
      }));
  } catch {
    return [];
  }
}

// --- Meetup --- scraping + extraction Claude ---

export const MEETUP_LOCATION: Record<string, string> = {
  paris: "fr--Paris", lyon: "fr--Lyon", bordeaux: "fr--Bordeaux", marseille: "fr--Marseille",
  toulouse: "fr--Toulouse", nantes: "fr--Nantes", lille: "fr--Lille", strasbourg: "fr--Strasbourg",
  london: "gb--London", berlin: "de--Berlin", amsterdam: "nl--Amsterdam",
};

export function buildMeetupUrl(ville: string, dateFrom: string, dateEnd: string, keywords: string): string {
  const params = new URLSearchParams({
    location: MEETUP_LOCATION[ville.toLowerCase()] ?? `fr--${ville}`,
    source: "EVENTS",
    startDateRange: dateFrom,
    endDateRange: dateEnd,
  });
  if (keywords) params.set("keywords", keywords);
  return `https://www.meetup.com/find/events/?${params}`;
}

export function extractMeetupData(html: string): string {
  const nd = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (nd) {
    try {
      const pp = (((JSON.parse(nd[1]) as Record<string, unknown>)?.props as Record<string, unknown>)?.pageProps ?? {}) as Record<string, unknown>;
      const hit = [(pp?.pagePayload as Record<string, unknown>)?.eventResults, pp?.eventSearch, pp?.searchResultsData, pp?.serverData].find(Boolean);
      if (hit) {
        const s = JSON.stringify(hit);
        return s.length > 10000 ? s.slice(0, 10000) + "…" : s;
      }
    } catch { /* next */ }
  }
  const blocks: string[] = [];
  html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi, (_, b) => { blocks.push(b); return ""; });
  if (blocks.length) {
    const s = "[" + blocks.join(",") + "]";
    return s.length > 10000 ? s.slice(0, 10000) + "…" : s;
  }
  return html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").slice(0, 6000);
}

export async function fetchMeetupData(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return "";
    return extractMeetupData(await res.text());
  } catch {
    return "";
  }
}

// --- Utilitaire : semaine (lundi → dimanche) ---

export function getWeekRange(dateStr: string): { weekFrom: string; weekTo: string } {
  const d = new Date(dateStr);
  const day = d.getUTCDay(); // 0=Sun, 1=Mon, …
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return {
    weekFrom: monday.toISOString().slice(0, 10),
    weekTo: sunday.toISOString().slice(0, 10),
  };
}
