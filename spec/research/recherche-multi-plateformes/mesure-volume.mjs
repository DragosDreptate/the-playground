// Mesure ponctuelle du volume d'événements à Paris sur Luma, Meetup et Eventbrite (#630).
// Lecture seule, en-tête qui nous nomme, pause entre chaque requête, arrêt sur 429.
// Usage : node mesure-volume.mjs > resultat.json   (≈ 32 requêtes, ≈ 1 min)
// Mettre TODAY à la date du jour avant de lancer.
const UA = "ThePlayground-mesure/0.1 (+https://the-playground.fr)";
const PAUSE_MS = 1500;
const MAX_PAGES = 40;
const PARIS = { lat: 48.8566, lon: 2.3522 };
const KEYWORDS = ["", "IA", "produit"];
const TODAY = "2026-10-09";
const HORIZONS = [7, 30, 60];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const addDays = (date, n) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const END = Object.fromEntries(HORIZONS.map((h) => [h, addDays(TODAY, h - 1)]));
const label = (kw) => (kw ? `« ${kw} »` : "sans mot-clé");
let requests = 0;

async function get(url, init = {}) {
  await sleep(PAUSE_MS);
  requests++;
  const res = await fetch(url, { ...init, headers: { "User-Agent": UA, ...(init.headers ?? {}) }, signal: AbortSignal.timeout(20000) });
  if (res.status === 429) throw new Error(`429 sur ${new URL(url).host} : arrêt`);
  return res;
}

function countByHorizon(dates) {
  return Object.fromEntries(HORIZONS.map((h) => [h, dates.filter((d) => d >= TODAY && d <= END[h]).length]));
}

async function luma(kw) {
  const dates = [];
  const cities = {};
  let cursor, pages = 0, stop = "fin des résultats";
  for (; pages < MAX_PAGES; pages++) {
    const params = new URLSearchParams({ latitude: String(PARIS.lat), longitude: String(PARIS.lon), pagination_limit: "50" });
    if (kw) params.set("query", kw);
    if (cursor) params.set("pagination_cursor", cursor);
    const res = await get(`https://api.lu.ma/discover/get-paginated-events?${params}`, { headers: { Accept: "application/json" } });
    if (!res.ok) { stop = `HTTP ${res.status}`; break; }
    const json = await res.json();
    const entries = json.entries ?? [];
    for (const e of entries) {
      const d = e.event?.start_at?.slice(0, 10);
      if (d) dates.push(d);
      const c = e.event?.geo_address_info?.city ?? "(inconnue)";
      cities[c] = (cities[c] ?? 0) + 1;
    }
    if (!json.has_more || !json.next_cursor) break;
    if (entries.length && entries.every((e) => e.event.start_at.slice(0, 10) > END[60])) { stop = "au-delà de 60 jours"; break; }
    cursor = json.next_cursor;
  }
  if (pages >= MAX_PAGES) stop = `plafond de ${MAX_PAGES} pages`;
  const topCities = Object.entries(cities).sort((a, b) => b[1] - a[1]).slice(0, 6);
  return { counts: countByHorizon(dates), pages: pages + 1, stop, topCities };
}

// Pages de 50 lors de la mesure du 2026-10-09 ; 200 fonctionne (au-delà, liste vide sans erreur).
const MEETUP_FIELDS = "pageInfo { hasNextPage endCursor } edges { node { dateTime eventType venue { city } } }";
async function meetup(kw) {
  const filter = { lat: PARIS.lat, lon: PARIS.lon, radius: 25, eventType: "PHYSICAL", startDateRange: `${addDays(TODAY, -1)}T00:00:00Z`, endDateRange: `${addDays(END[60], 1)}T23:59:59Z` };
  const query = kw
    ? `query($filter: EventSearchFilter!, $after: String) { search: eventSearch(filter: $filter, first: 50, after: $after) { ${MEETUP_FIELDS} } }`
    : `query($filter: RecommendedEventsFilter!, $after: String) { search: recommendedEvents(filter: $filter, first: 50, after: $after) { ${MEETUP_FIELDS} } }`;
  const dates = [];
  let after = null, pages = 0, stop = "fin des résultats";
  for (; pages < MAX_PAGES; pages++) {
    const res = await get("https://www.meetup.com/gql2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { filter: kw ? { ...filter, query: kw } : filter, after } }),
    });
    const json = res.ok ? await res.json().catch(() => null) : null;
    if (!json?.data) { stop = `réponse inattendue (HTTP ${res.status})`; break; }
    const s = json.data.search;
    for (const e of s?.edges ?? []) {
      const n = e?.node;
      if (n?.eventType === "PHYSICAL" && n.dateTime) dates.push(n.dateTime.slice(0, 10));
    }
    if (!s?.pageInfo?.hasNextPage || !s.pageInfo.endCursor) break;
    after = s.pageInfo.endCursor;
  }
  if (pages >= MAX_PAGES) stop = `plafond de ${MAX_PAGES} pages`;
  return { counts: countByHorizon(dates), pages: pages + 1, stop };
}

// Eventbrite annonce son total sur la première page : une seule requête par cas.
async function eventbrite(kw, horizon) {
  const params = new URLSearchParams({ start_date: TODAY, end_date: END[horizon] });
  if (kw) params.set("q", kw);
  const res = await get(`https://www.eventbrite.fr/d/france--paris/events/?${params}`, {
    headers: { Accept: "text/html", "Accept-Language": "fr-FR,fr;q=0.9" },
  });
  if (!res.ok) return { total: null, pages: null, stop: `HTTP ${res.status}` };
  const html = await res.text();
  const total = html.match(/"object_count"\s*:\s*(\d+)/)?.[1];
  const pageCount = html.match(/"page_count"\s*:\s*(\d+)/)?.[1];
  return { total: total ? Number(total) : null, pages: pageCount ? Number(pageCount) : null, stop: total ? "ok" : "compteur absent de la page" };
}

const out = { luma: {}, meetup: {}, eventbrite: {} };
try {
  for (const kw of KEYWORDS) { out.luma[label(kw)] = await luma(kw); console.error("luma", label(kw), JSON.stringify(out.luma[label(kw)])); }
  for (const kw of KEYWORDS) { out.meetup[label(kw)] = await meetup(kw); console.error("meetup", label(kw), JSON.stringify(out.meetup[label(kw)])); }
  for (const kw of KEYWORDS) {
    out.eventbrite[label(kw)] = {};
    for (const h of HORIZONS) { out.eventbrite[label(kw)][h] = await eventbrite(kw, h); console.error("eventbrite", label(kw), h, JSON.stringify(out.eventbrite[label(kw)][h])); }
  }
} catch (err) {
  out.erreur = String(err);
}
out.requetes = requests;
console.log(JSON.stringify(out, null, 2));
