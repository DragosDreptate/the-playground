import type { AiTextCall } from "@/lib/ai-text-call";

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

// --- Helper : déduplication par URL ---

export function deduplicateByUrl(events: EventResult[]): EventResult[] {
  const seen = new Set<string>();
  return events.filter((e) => {
    if (seen.has(e.url)) return false;
    seen.add(e.url);
    return true;
  });
}

// --- Luma API — une requête par mot-clé en parallèle ---

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
  keywords: string[],
  dateFrom: string,
  dateEnd: string
): Promise<EventResult[]> {
  const queries = keywords.length > 0 ? keywords : [""];
  const locationTerms = LUMA_LOCATION_TERMS[ville.toLowerCase()] ?? [ville.toLowerCase()];
  const villeKey = ville.toLowerCase();

  const results = await Promise.all(
    queries.map(async (kw): Promise<EventResult[]> => {
      try {
        const params = new URLSearchParams({ near: LUMA_CITY[villeKey] ?? ville, pagination_limit: "10" });
        if (kw) params.set("query", kw);
        const res = await fetch(`https://api.lu.ma/discover/get-paginated-events?${params}`, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) return [];

        const json = (await res.json()) as { entries?: LumaEntry[] };

        return (json.entries ?? [])
          .filter((e) => {
            const d = e.event.start_at.slice(0, 10);
            if (d < dateFrom || d > dateEnd) return false;
            // Exclure les événements online — le radar cherche les conflits physiques
            if (e.event.location_type !== "offline") return false;
            const featuredSlug = e.featured_city?.slug?.toLowerCase() ?? "";
            if (featuredSlug && (featuredSlug === villeKey || featuredSlug === LUMA_CITY[villeKey]?.toLowerCase())) return true;
            const loc = e.event.geo_address_info?.city_state?.toLowerCase();
            if (loc) return locationTerms.some((t) => loc.includes(t));
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
    })
  );

  return deduplicateByUrl(results.flat()).slice(0, 10);
}

// --- Eventbrite — une requête par mot-clé en parallèle ---

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

export function buildEventbriteUrl(ville: string, dateFrom: string, dateEnd: string, keyword: string): string {
  const location = EVENTBRITE_LOCATION[ville.toLowerCase()] ?? `france--${ville.toLowerCase()}`;
  const params = new URLSearchParams({ start_date: dateFrom, end_date: dateEnd });
  if (keyword) params.set("q", keyword);
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
  itemListElement?: { item?: EventbriteJsonLd }[];
};

/**
 * Événements d'un bloc JSON-LD Eventbrite. Depuis 2026, la page de recherche
 * les regroupe dans une `ItemList` (`itemListElement[].item`) ; l'ancien format
 * (événements posés à plat, seuls ou en tableau) reste accepté.
 */
function eventbriteJsonLdItems(data: EventbriteJsonLd | EventbriteJsonLd[]): EventbriteJsonLd[] {
  return (Array.isArray(data) ? data : [data]).flatMap((node) =>
    node["@type"] === "ItemList"
      ? (node.itemListElement ?? []).flatMap((el) => (el.item ? [el.item] : []))
      : [node]
  );
}

export function extractEventbriteEvents(
  html: string,
  dateFrom: string,
  dateEnd: string,
  locationTerms: string[],
  expectedCountry: string
): EventResult[] {
  const blocks: string[] = [];
  html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi, (_, b) => {
    blocks.push(b);
    return "";
  });

  const events: EventResult[] = [];
  let structureFound = false;

  for (const block of blocks) {
    try {
      const data = JSON.parse(block) as EventbriteJsonLd | EventbriteJsonLd[];
      if ((Array.isArray(data) ? data : [data]).some((n) => n["@type"] === "ItemList" || n["@type"] === "Event")) {
        structureFound = true;
      }
      for (const item of eventbriteJsonLdItems(data)) {
        if (item["@type"] !== "Event" || !item.startDate || !item.url) continue;
        const date = item.startDate.slice(0, 10);
        if (date < dateFrom || date > dateEnd) continue;
        // Exclure les événements online — le radar cherche les conflits physiques
        const isOnline = item.eventAttendanceMode?.includes("Online") || item.eventAttendanceMode?.includes("Mixed");
        if (isOnline) continue;
        const country = item.location?.address?.addressCountry?.toLowerCase() ?? "";
        const locality = item.location?.address?.addressLocality?.toLowerCase() ?? "";
        const region = item.location?.address?.addressRegion?.toLowerCase() ?? "";
        const locText = `${locality} ${region}`;
        if (country && country !== expectedCountry) continue;
        if (locality && !locationTerms.some((t) => locText.includes(t))) continue;
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

  // Une recherche sans résultat garde sa liste (vide) : aucune structure du
  // tout signale qu'Eventbrite a changé sa page, panne sinon invisible.
  if (!structureFound) console.warn("[radar] Eventbrite : aucune donnée d'événement lisible dans la page");

  return events;
}

export async function fetchAndFilterEventbriteEvents(
  ville: string,
  dateFrom: string,
  dateEnd: string,
  locationTerms: string[],
  expectedCountry: string,
  keywords: string[]
): Promise<EventResult[]> {
  const queries = keywords.length > 0 ? keywords : [""];

  const results = await Promise.all(
    queries.map(async (kw): Promise<EventResult[]> => {
      try {
        const url = buildEventbriteUrl(ville, dateFrom, dateEnd, kw);
        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
            Accept: "text/html,application/xhtml+xml",
          },
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) return [];
        // Le filtrage par mot-clé est fait par l'API (?q=kw) — on ne post-filtre que par localisation
        return extractEventbriteEvents(await res.text(), dateFrom, dateEnd, locationTerms, expectedCountry);
      } catch {
        return [];
      }
    })
  );

  return deduplicateByUrl(results.flat()).slice(0, 10);
}

// --- Meetup — scraping HTML ---

export const MEETUP_LOCATION: Record<string, string> = {
  paris: "fr--Paris", lyon: "fr--Lyon", bordeaux: "fr--Bordeaux", marseille: "fr--Marseille",
  toulouse: "fr--Toulouse", nantes: "fr--Nantes", lille: "fr--Lille", strasbourg: "fr--Strasbourg",
  london: "gb--London", berlin: "de--Berlin", amsterdam: "nl--Amsterdam",
};

export function buildMeetupUrl(ville: string, dateFrom: string, dateEnd: string, keyword: string): string {
  const params = new URLSearchParams({
    location: MEETUP_LOCATION[ville.toLowerCase()] ?? `fr--${ville}`,
    source: "EVENTS",
    startDateRange: dateFrom,
    endDateRange: dateEnd,
  });
  if (keyword) params.set("keywords", keyword);
  return `https://www.meetup.com/find/events/?${params}`;
}

type MeetupApolloRef = { __ref?: string };
type MeetupVenue = { name?: string; city?: string };
type MeetupApolloEvent = {
  title?: string;
  dateTime?: string; // "2026-10-08T18:30:00+02:00", heure locale de l'événement
  eventUrl?: string;
  eventType?: string; // "PHYSICAL" | "ONLINE" | ... ; absent sur les entrées partielles
  description?: string;
  venue?: MeetupVenue & MeetupApolloRef;
};

/**
 * Événements Meetup lus directement dans la page de recherche, sans IA.
 *
 * Depuis 2026, la page porte ses résultats dans le cache Apollo du bloc
 * `__NEXT_DATA__` (`pageProps.__APOLLO_STATE__`, une entrée `Event:<id>` par
 * événement). Les entrées sans `eventType` sont des références partielles
 * d'autres requêtes de la page : seules les entrées complètes sont lues.
 * Présentiel uniquement, comme pour Eventbrite : le radar cherche les conflits physiques.
 */
export function extractMeetupEvents(html: string, dateFrom: string, dateEnd: string): EventResult[] {
  const nd = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  let apollo: Record<string, unknown> | null = null;
  try {
    const parsed = nd ? (JSON.parse(nd[1]) as { props?: { pageProps?: { __APOLLO_STATE__?: Record<string, unknown> } } }) : null;
    apollo = parsed?.props?.pageProps?.__APOLLO_STATE__ ?? null;
  } catch { /* JSON illisible : même traitement qu'un bloc absent */ }

  if (!apollo) {
    // Panne sinon invisible : la page répond mais Meetup a changé sa structure.
    console.warn("[radar] Meetup : aucune donnée d'événement lisible dans la page");
    return [];
  }

  const venueOf = (venue: MeetupApolloEvent["venue"]): MeetupVenue | undefined =>
    venue?.__ref ? (apollo[venue.__ref] as MeetupVenue | undefined) : venue;

  return Object.entries(apollo)
    .filter(([key]) => key.startsWith("Event:"))
    .map(([, value]) => value as MeetupApolloEvent)
    .filter((e) => e.eventType === "PHYSICAL" && e.dateTime && e.eventUrl)
    .flatMap((e): EventResult[] => {
      const date = e.dateTime!.slice(0, 10);
      if (date < dateFrom || date > dateEnd) return [];
      const venue = venueOf(e.venue);
      return [{
        title: e.title ?? "Sans titre",
        date,
        time: e.dateTime!.slice(11, 16) || null,
        location: venue?.name ?? venue?.city ?? null,
        url: e.eventUrl!,
        source: "meetup",
        description: e.description ? e.description.slice(0, 150) : null,
      }];
    })
    .slice(0, 10);
}

export async function fetchMeetupEvents(url: string, dateFrom: string, dateEnd: string): Promise<EventResult[]> {
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
    return extractMeetupEvents(await res.text(), dateFrom, dateEnd);
  } catch {
    return [];
  }
}

// --- Mots-clés + ville d'un événement — extraction Claude ---

export async function extractKeywordsAndCity(
  aiCall: AiTextCall,
  title: string,
  description: string,
  locationName: string,
  locationAddress: string
): Promise<{ keywords: string[]; city: string | null; country: string | null }> {
  const prompt = `Analyse cet événement et extrais les informations demandées.

Titre : ${title}
Description : ${description || "(vide)"}
Lieu : ${locationName || "(vide)"}
Adresse : ${locationAddress || "(vide)"}

Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour :
{
  "keywords": ["mot1", "mot2", "mot3"],
  "city": "NomDeVille ou null si introuvable",
  "country": "fr ou en ou de ou nl ou es, null si inconnu"
}

Règles :
- keywords : 2 à 3 mots-clés maximum, extraits PRINCIPALEMENT du titre (priorité 1), puis nom de lieu/communauté (priorité 2), enfin description (priorité 3). Termes les plus spécifiques et distinctifs. Éviter les termes trop génériques.
- city : ville principale extraite de l'adresse ou du nom de lieu. null si impossible à déterminer
- country : code pays ISO 2 lettres (fr, gb, de, nl, es...). null si inconnu`;

  // Plafonds relevés de ~30 % à la migration Haiku 5.5 (tokenizer plus gourmand).
  const text = await aiCall(prompt, 300);
  if (!text) return { keywords: [], city: null, country: null };

  try {
    const raw = text.trim();
    const jsonStr = raw.startsWith("{") ? raw : raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
    const parsed = JSON.parse(jsonStr) as { keywords?: string[]; city?: string | null; country?: string | null };
    return {
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords.filter(Boolean) : [],
      city: parsed.city ?? null,
      country: parsed.country ?? null,
    };
  } catch {
    return { keywords: [], city: null, country: null };
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
