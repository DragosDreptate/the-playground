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

// --- Position de la ville (partagée par Luma et Meetup) ---

export type CityPosition = { lat: number; lon: number };

/** Centre des villes connues du radar : aucun appel réseau pour les cas courants. */
export const CITY_POSITION: Record<string, CityPosition> = {
  paris: { lat: 48.8566, lon: 2.3522 }, lyon: { lat: 45.764, lon: 4.8357 },
  bordeaux: { lat: 44.8378, lon: -0.5792 }, marseille: { lat: 43.2965, lon: 5.3698 },
  toulouse: { lat: 43.6047, lon: 1.4442 }, nantes: { lat: 47.2184, lon: -1.5536 },
  lille: { lat: 50.6292, lon: 3.0573 }, strasbourg: { lat: 48.5734, lon: 7.7521 },
  london: { lat: 51.5072, lon: -0.1276 }, berlin: { lat: 52.52, lon: 13.405 },
  amsterdam: { lat: 52.3676, lon: 4.9041 },
};

/**
 * Position d'une ville : table des villes connues, sinon géocodage Meetup (ville
 * seule, sans supposer de pays : sinon Montréal tomberait dans l'Aude).
 * Luma en a besoin car il ignore le nom de ville (`near`) et place la recherche
 * d'après l'adresse IP de l'appelant, c'est-à-dire du serveur Vercel en prod.
 */
export async function resolveCityPosition(ville: string): Promise<CityPosition | null> {
  const known = CITY_POSITION[ville.toLowerCase()];
  if (known) return known;
  const located = await meetupGql<{ locationSearch: CityPosition[] | null }>(MEETUP_LOCATION_QUERY, { query: ville });
  return located?.locationSearch?.[0] ?? null;
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
  position: CityPosition | null,
  keywords: string[],
  dateFrom: string,
  dateEnd: string
): Promise<EventResult[]> {
  // Sans position, Luma chercherait autour du serveur : rien d'exploitable.
  if (!position) return [];
  const queries = keywords.length > 0 ? keywords : [""];
  const locationTerms = LUMA_LOCATION_TERMS[ville.toLowerCase()] ?? [ville.toLowerCase()];
  const villeKey = ville.toLowerCase();

  const results = await Promise.all(
    queries.map(async (kw): Promise<EventResult[]> => {
      try {
        const params = new URLSearchParams({
          latitude: String(position.lat),
          longitude: String(position.lon),
          pagination_limit: "10",
        });
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
  itemListElement?: ({ item?: EventbriteJsonLd } | null)[];
};

/**
 * Événements d'un bloc JSON-LD Eventbrite. Depuis 2026, la page de recherche
 * les regroupe dans une `ItemList` (`itemListElement[].item`) ; l'ancien format
 * (événements posés à plat, seuls ou en tableau) reste accepté.
 *
 * `readable` dit si le bloc porte des événements qu'on sait lire. Une liste
 * vide est une recherche sans résultat (lisible) ; une liste dont aucun élément
 * ne donne d'événement signale qu'Eventbrite a changé de format.
 */
function eventbriteJsonLdEvents(data: unknown): { events: EventbriteJsonLd[]; readable: boolean } {
  const nodes = (Array.isArray(data) ? data : [data]).filter(
    (n): n is EventbriteJsonLd => !!n && typeof n === "object"
  );
  const events: EventbriteJsonLd[] = [];
  let readable = false;
  for (const node of nodes) {
    if (node["@type"] === "Event") {
      events.push(node);
      readable = true;
    } else if (node["@type"] === "ItemList") {
      const elements = node.itemListElement ?? [];
      const listed = elements.flatMap((el) => (el?.item?.["@type"] === "Event" ? [el.item] : []));
      events.push(...listed);
      if (elements.length === 0 || listed.length > 0) readable = true;
    }
  }
  return { events, readable };
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
  let readable = false;

  for (const block of blocks) {
    try {
      const parsed = eventbriteJsonLdEvents(JSON.parse(block));
      if (parsed.readable) readable = true;
      for (const item of parsed.events) {
        if (!item.startDate || !item.url) continue;
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

  // Panne sinon invisible : la page répond mais Eventbrite a changé son format.
  if (!readable) console.warn("[radar] Eventbrite : aucune donnée d'événement lisible dans la page");

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

// --- Meetup — API GraphQL interne du site ---

/**
 * Meetup est interrogé par l'API GraphQL qu'utilise son propre site
 * (`/gql2`, sans authentification) : sa page de recherche ignore désormais
 * la plage de dates demandée, l'API la respecte.
 *
 * Ce point d'accès n'est pas documenté et peut changer sans préavis : usage
 * ponctuel, à réévaluer si le volume du radar augmente (spec/decisions.md, 2026-10-08).
 */
const MEETUP_GQL_URL = "https://www.meetup.com/gql2";
const MEETUP_RADIUS_KM = 25;

const MEETUP_EVENT_FIELDS = "edges { node { title dateTime eventType eventUrl description venue { name city } } }";
const MEETUP_LOCATION_QUERY = "query($query: String!) { locationSearch(query: $query) { lat lon } }";
// Avec mot-clé : moteur de recherche du site. Sans mot-clé, `eventSearch`
// ne renvoie rien : on prend les événements recommandés de la zone.
// 50 résultats : sur une fenêtre de 9 jours dans une grande ville, 20 pouvaient
// se concentrer sur les premiers jours et laisser la fin de semaine vide.
const MEETUP_KEYWORD_QUERY = `query($filter: EventSearchFilter!) { search: eventSearch(filter: $filter, first: 50) { ${MEETUP_EVENT_FIELDS} } }`;
const MEETUP_NEARBY_QUERY = `query($filter: RecommendedEventsFilter!) { search: recommendedEvents(filter: $filter, first: 50) { ${MEETUP_EVENT_FIELDS} } }`;

export type MeetupEventNode = {
  title?: string;
  dateTime?: string; // "2026-10-14T19:00:00+02:00", heure locale de l'événement
  eventType?: string; // "PHYSICAL" | "ONLINE" | ...
  eventUrl?: string;
  description?: string;
  venue?: { name?: string; city?: string } | null;
};

/**
 * Fenêtre envoyée à l'API, élargie d'un jour de chaque côté : l'API raisonne
 * en instants UTC, alors que la semaine du radar se compte en dates locales.
 * Le filtre exact se fait ensuite sur la date locale (meetupNodesToEvents).
 */
export function meetupSearchWindow(dateFrom: string, dateEnd: string): { startDateRange: string; endDateRange: string } {
  const shift = (date: string, days: number) => {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };
  return { startDateRange: `${shift(dateFrom, -1)}T00:00:00Z`, endDateRange: `${shift(dateEnd, 1)}T23:59:59Z` };
}

/** Événements en présentiel de la semaine demandée, au format du radar. */
export function meetupNodesToEvents(nodes: MeetupEventNode[], dateFrom: string, dateEnd: string): EventResult[] {
  return nodes
    .filter((n) => n.eventType === "PHYSICAL" && n.dateTime && n.eventUrl)
    .flatMap((n): EventResult[] => {
      const date = n.dateTime!.slice(0, 10);
      if (date < dateFrom || date > dateEnd) return [];
      return [{
        title: n.title ?? "Sans titre",
        date,
        time: n.dateTime!.slice(11, 16) || null,
        location: n.venue?.name ?? n.venue?.city ?? null,
        url: n.eventUrl!,
        source: "meetup",
        description: n.description ? n.description.slice(0, 150) : null,
      }];
    });
}

/**
 * Appel GraphQL. `null` si l'API ne répond pas comme attendu : en cas de
 * changement de schéma ou de blocage, l'avertissement évite une panne invisible.
 * Seuls les échecs réseau et les délais dépassés restent silencieux, comme pour
 * les autres sources.
 */
async function meetupGql<T>(query: string, variables: Record<string, unknown>): Promise<T | null> {
  let res: Response;
  try {
    res = await fetch(MEETUP_GQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return null;
  }

  let json: { data?: T | null; errors?: unknown[] } | null = null;
  try {
    json = res.ok ? await res.json() : null;
  } catch { /* corps non JSON : page anti-robots ou de maintenance */ }

  if (!json?.data) {
    console.warn(`[radar] Meetup : réponse inattendue de l'API (HTTP ${res.status})`, json?.errors?.[0] ?? "");
    return null;
  }
  // Réponse partielle (un champ en erreur sur un événement) : on garde le reste.
  if (json.errors?.length) console.warn("[radar] Meetup : réponse partielle de l'API", json.errors[0]);
  return json.data;
}

export async function fetchMeetupEvents(
  position: CityPosition | null,
  dateFrom: string,
  dateEnd: string,
  keywords: string[]
): Promise<EventResult[]> {
  if (!position) return [];

  const baseFilter = {
    lat: position.lat,
    lon: position.lon,
    radius: MEETUP_RADIUS_KM,
    eventType: "PHYSICAL",
    ...meetupSearchWindow(dateFrom, dateEnd),
  };
  const queries = keywords.length > 0 ? keywords : [""];

  const results = await Promise.all(
    queries.map(async (kw) => {
      const data = await meetupGql<{ search: { edges: ({ node: MeetupEventNode | null } | null)[] } | null }>(
        kw ? MEETUP_KEYWORD_QUERY : MEETUP_NEARBY_QUERY,
        { filter: kw ? { ...baseFilter, query: kw } : baseFilter }
      );
      // Une réponse partielle peut contenir des entrées nulles.
      const nodes = (data?.search?.edges ?? []).flatMap((e) => (e?.node ? [e.node] : []));
      return meetupNodesToEvents(nodes, dateFrom, dateEnd);
    })
  );

  return deduplicateByUrl(results.flat()).slice(0, 10);
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
