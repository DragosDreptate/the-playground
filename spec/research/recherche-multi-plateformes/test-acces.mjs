// Test ponctuel (#630) : accès aux trois plateformes, taille de page Meetup,
// options de tri Meetup, point d'accès Eventbrite /v3/destination/search/.
// Lecture seule, en-tête qui nous nomme. Usage : node test-acces.mjs  (≈ 25 requêtes)
// Le même script, réduit aux trois premiers appels, a été lancé dans un bac à sable
// Vercel (région cdg1) le 2026-10-09 pour vérifier l'accès depuis leur infrastructure.
const UA = "ThePlayground-mesure/0.1 (+https://the-playground.fr)";
const PAUSE_MS = 1500;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let requests = 0;

async function call(url, init = {}) {
  await sleep(PAUSE_MS);
  requests++;
  const res = await fetch(url, { ...init, headers: { "User-Agent": UA, ...(init.headers ?? {}) }, signal: AbortSignal.timeout(20000) });
  if (res.status === 429) throw new Error(`429 sur ${new URL(url).host} : arrêt`);
  return res;
}

async function gql(query, variables = {}) {
  const res = await call("https://www.meetup.com/gql2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

const filter = { lat: 48.8566, lon: 2.3522, radius: 25, eventType: "PHYSICAL", startDateRange: "2026-10-08T00:00:00Z", endDateRange: "2026-11-08T23:59:59Z" };
const out = {};

// 0. Accès de base : Luma, Eventbrite (Meetup est couvert par les appels suivants)
{
  const res = await call("https://api.lu.ma/discover/get-paginated-events?latitude=48.8566&longitude=2.3522&pagination_limit=50", { headers: { Accept: "application/json" } });
  const j = await res.json().catch(() => null);
  out.luma = { status: res.status, evenements: j?.entries?.length ?? null };
}
{
  const res = await call("https://www.eventbrite.fr/d/france--paris/events/", { headers: { Accept: "text/html", "Accept-Language": "fr-FR,fr;q=0.9" } });
  out.eventbrite_page = { status: res.status, total: (await res.text()).match(/"object_count"\s*:\s*(\d+)/)?.[1] ?? null };
}

// 1. Taille de page maximale de Meetup (2026-10-09 : 100 → 93, 200 → 185, 500 → 0 sans erreur)
for (const first of [100, 200, 500]) {
  const { status, json } = await gql(
    `query($filter: RecommendedEventsFilter!) { search: recommendedEvents(filter: $filter, first: ${first}) { pageInfo { hasNextPage } edges { node { id } } } }`,
    { filter }
  );
  out[`meetup_first_${first}`] = { status, recus: json?.data?.search?.edges?.length ?? null, erreur: json?.errors?.[0]?.message ?? null };
}

// 2. Options de tri Meetup (2026-10-09 : DATETIME et RELEVANCE seulement)
for (const type of ["RecommendedEventsSortField", "KeywordSortField"]) {
  const { json } = await gql(`{ __type(name: "${type}") { enumValues { name } } }`);
  out[`meetup_${type}`] = json?.data?.__type?.enumValues?.map((v) => v.name) ?? null;
}

// 3. Point d'accès Eventbrite sans jeton (2026-10-09 : 401, jeton OAuth requis)
{
  const res = await call("https://www.eventbriteapi.com/v3/destination/search/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event_search: { q: "", places: ["85633147"], page_size: 50 } }),
  });
  out.eventbrite_destination_sans_jeton = { status: res.status, debut: (await res.text()).slice(0, 200) };
}

out.requetes = requests;
console.log(JSON.stringify(out, null, 2));
