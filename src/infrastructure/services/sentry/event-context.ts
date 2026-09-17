/**
 * Extraction du contexte d'un événement Sentry, pour alimenter l'analyse.
 *
 * Fonctions PURES, sans réseau : c'est ici que se joue la qualité du
 * diagnostic, donc c'est ici que portent les tests.
 */

export type SentryEventFrame = {
  filename?: string;
  lineNo?: number;
  colNo?: number;
  function?: string;
  inApp?: boolean;
  context?: [number, string][];
};

export type SentryRequest = {
  /**
   * Chemin SANS la query string : Sentry range celle-ci dans un champ `query`
   * distinct. C'est ce qui rend l'URL sûre à transmettre au modèle.
   *
   * 🚨 Ne JAMAIS ajouter `query` ici sans filtrage : sur le callback du magic
   * link, il porte l'email du visiteur en clair (le `token`, lui, est déjà
   * masqué par le scrubbing de Sentry).
   */
  url?: string;
  method?: string;
  /** L'API Sentry renvoie un TABLEAU de paires, pas un objet. */
  headers?: [string, string][];
};

export type SentryEvent = {
  eventID: string;
  title: string;
  tags: { key: string; value: string }[];
  /** Absent de `events/latest/`, qui range la requête dans `entries`. */
  request?: SentryRequest;
  entries: {
    type: string;
    /** Selon `type` : les exceptions portent `values`, la requête ses champs HTTP. */
    data: {
      values?: {
        type: string;
        value: string;
        mechanism?: { type: string; handled: boolean };
        stacktrace?: { frames: SentryEventFrame[] };
      }[];
    } & SentryRequest;
  }[];
};

/**
 * ⚠️ `events/latest/` ne pose AUCUN champ `request` à la racine : la requête
 * HTTP vit dans l'entrée `entries[type="request"]`. Lire au mauvais endroit ne
 * lève rien, ça renvoie juste `undefined` — et le prompt annonçait alors
 * « aucune request HTTP » sur une erreur déclenchée par un POST, ce qui
 * orientait le modèle vers un job de fond inexistant.
 *
 * Le repli sur `event.request` couvre les autres endpoints de l'API, qui le
 * fournissent bien à la racine.
 */
function findRequest(event: SentryEvent): SentryRequest | undefined {
  const entry = event.entries?.find((e) => e.type === "request");
  return entry?.data ?? event.request;
}

export type EventContext = {
  stacktrace: string;
  tags: Record<string, string>;
  requestUrl?: string;
  requestMethod?: string;
  requestHeaders: Record<string, string>;
  /** Occurrences de l'issue et utilisateurs distincts touchés, quand connus. */
  eventCount?: number;
  userCount?: number;
};

/** Fabrique, et non constante partagée : `tags` et `requestHeaders` sont des
 * objets mutables qu'un appelant ne doit pas pouvoir polluer pour les autres. */
export function emptyEventContext(): EventContext {
  return { stacktrace: "", tags: {}, requestHeaders: {} };
}

/**
 * Normalise un compteur du payload webhook (tiers). Une valeur absente ou
 * illisible RESTE absente.
 *
 * ⚠️ `null` et `""` doivent rester absents : `Number(null)` et `Number("")`
 * valent 0 et passent `Number.isFinite`. Une donnée manquante deviendrait
 * « 0 utilisateur touché », c'est-à-dire un argument fabriqué en faveur du
 * classement en bruit.
 */
export function toFiniteCount(value: string | number | null | undefined): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string" && value.trim() === "") return undefined;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * En-têtes transmis au modèle. LISTE BLANCHE stricte, jamais une liste noire :
 * une liste noire laisserait passer tout en-tête futur.
 *
 * Volontairement absents, pour deux raisons distinctes :
 *  - fuite de secret : `cookie`, `authorization`, et surtout `forwarded`, qui
 *    porte un jeton Bearer signé émis par Vercel ;
 *  - donnée personnelle : `x-forwarded-for`, `x-real-ip`. L'ASN et le pays
 *    suffisent à séparer un hébergeur d'un FAI résidentiel sans identifier
 *    personne.
 *
 * Écarte au passage le bruit : l'API Sentry mélange ici des en-têtes de
 * RÉPONSE (notre CSP fait à elle seule ~500 caractères).
 */
const FORWARDED_HEADERS = new Set([
  // Client falsifié, absent, ou outil connu (curl, python-requests).
  "user-agent",
  // `multipart/form-data` sur une route de page : signature d'un POST arbitraire.
  "content-type",
  // Corps anormalement gros sur une page sans formulaire.
  "content-length",
  // Le signal décisif : hébergeur (scan) vs FAI résidentiel (vrai visiteur).
  "x-vercel-ip-as-number",
  "x-vercel-ip-country",
  "x-vercel-ip-city",
]);

/** Un en-tête inattendu ne doit pas gonfler le prompt. */
const MAX_HEADER_VALUE_LENGTH = 200;

/** Défensif : la forme vient d'une API tierce, elle n'est pas garantie. */
function extractHeaders(request: SentryRequest | undefined): Record<string, string> {
  const raw = request?.headers;
  if (!Array.isArray(raw)) return {};

  const headers: Record<string, string> = {};
  for (const pair of raw) {
    if (!Array.isArray(pair) || pair.length < 2) continue;
    const [name, value] = pair;
    if (typeof name !== "string" || typeof value !== "string") continue;

    const key = name.toLowerCase();
    if (!FORWARDED_HEADERS.has(key)) continue;
    headers[key] = value.slice(0, MAX_HEADER_VALUE_LENGTH);
  }
  return headers;
}

export function extractEventContext(event: SentryEvent): EventContext {
  const lines: string[] = [];

  for (const entry of event.entries ?? []) {
    if (entry.type !== "exception") continue;
    // `data?.` et pas seulement `?? []` : une entrée sans clé `data` lèverait
    // un TypeError, et `extractEventContext` tourne hors try/catch — l'alerte
    // serait perdue en silence.
    for (const val of entry.data?.values ?? []) {
      lines.push(`${val.type}: ${val.value}`);
      lines.push(`Handled: ${val.mechanism?.handled ?? "unknown"}`);
      const frames = val.stacktrace?.frames ?? [];
      const appFrames = frames.filter((f) => f.inApp);
      const relevantFrames = appFrames.length > 0 ? appFrames.slice(-8) : frames.slice(-5);
      for (const frame of relevantFrames) {
        lines.push(`  ${frame.filename}:${frame.lineNo} in ${frame.function ?? "(anonymous)"}`);
      }
    }
  }

  const tags: Record<string, string> = {};
  for (const t of event.tags ?? []) {
    tags[t.key] = t.value;
  }

  const request = findRequest(event);

  return {
    stacktrace: lines.join("\n"),
    tags,
    requestUrl: request?.url,
    requestMethod: request?.method,
    requestHeaders: extractHeaders(request),
  };
}
