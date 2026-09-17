import { existsSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { extractEventContext, type SentryEvent } from "../event-context";
import { ROUTE_MAP, buildAnalysisPrompt } from "../build-prompt";

/**
 * Événement réel de THE-PLAYGROUND-2P (17/09/2026), réduit : un scan de
 * vulnérabilités qui POSTait un multipart de 138 Ko sur la page d'accueil, et
 * que l'alerte avait annoncé en « UTILISATEUR BLOQUÉ ».
 *
 * Structure FIDÈLE à `events/latest/` : aucun champ `request` à la racine, la
 * requête vit dans `entries[type="request"]`, et les en-têtes y sont un TABLEAU
 * de paires, casse d'origine, en-têtes de RÉPONSE mélangés à ceux de la requête.
 */
const REQUEST_HEADERS: [string, string][] = [
  ["Content-Length", "137759"],
  ["Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'"],
  ["Content-Type", "multipart/form-data; boundary=----WebKitFormBoundary8e6243f2"],
  ["Cookie", "session=SECRET-SESSION-VALUE"],
  ["Forwarded", "for=209.127.74.65;sig=0QmVhcmVyIFNFQ1JFVA==;exp=1789669312"],
  ["Strict-Transport-Security", "max-age=63072000"],
  ["User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/152.0.0.0"],
  ["X-Forwarded-For", "209.127.74.65"],
  ["X-Real-Ip", "209.127.74.65"],
  ["X-Vercel-Ip-As-Number", "55286"],
  ["X-Vercel-Ip-City", "Montreal"],
  ["X-Vercel-Ip-Country", "CA"],
];

const SCAN_EVENT: SentryEvent = {
  eventID: "3c3932bb138d43939eaf080bfd60dd31",
  title: "Error: Failed to find Server Action.",
  tags: [
    { key: "browser", value: "Chrome 152.0.0" },
    { key: "client_os", value: "Windows >=10" },
    { key: "environment", value: "vercel-production" },
    { key: "handled", value: "no" },
    { key: "transaction", value: "/[locale]/page" },
    { key: "url", value: "https://the-playground.fr/" },
  ],
  entries: [
    {
      type: "exception",
      data: {
        values: [
          {
            type: "Error",
            value: "Failed to find Server Action.",
            mechanism: { type: "auto.function.nextjs.on_request_error", handled: false },
            stacktrace: {
              frames: [
                { filename: "/var/task/___next_launcher.cjs", lineNo: 224, function: "handler", inApp: true },
              ],
            },
          },
        ],
      },
    },
    {
      type: "request",
      data: {
        url: "https://the-playground.fr/",
        method: "POST",
        headers: REQUEST_HEADERS,
      },
    },
  ],
};

describe("extractEventContext", () => {
  const context = extractEventContext(SCAN_EVENT);

  it("retient les en-têtes qui distinguent un scanner d'un visiteur", () => {
    expect(context.requestHeaders).toEqual({
      "content-length": "137759",
      "content-type": "multipart/form-data; boundary=----WebKitFormBoundary8e6243f2",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/152.0.0.0",
      "x-vercel-ip-as-number": "55286",
      "x-vercel-ip-city": "Montreal",
      "x-vercel-ip-country": "CA",
    });
  });

  it("ne laisse fuir ni secret ni donnée personnelle vers le modèle", () => {
    const serialized = JSON.stringify(context.requestHeaders);
    expect(serialized).not.toContain("SECRET-SESSION-VALUE");
    // `Forwarded` porte un jeton Bearer signé émis par Vercel.
    expect(serialized).not.toContain("QmVhcmVy");
    // L'ASN et le pays suffisent : pas d'adresse IP.
    expect(serialized).not.toContain("209.127.74.65");
    expect(Object.keys(context.requestHeaders)).not.toContain("x-forwarded-for");
    expect(Object.keys(context.requestHeaders)).not.toContain("x-real-ip");
  });

  it("écarte les en-têtes de réponse que Sentry mélange aux en-têtes de requête", () => {
    expect(Object.keys(context.requestHeaders)).not.toContain("content-security-policy");
    expect(Object.keys(context.requestHeaders)).not.toContain("strict-transport-security");
  });

  it("lit la requête là où l'API la range vraiment, pas à la racine", () => {
    // Le bug d'origine : `event.request` n'existe pas sur events/latest/, donc
    // le prompt annonçait « aucune request HTTP » sur un POST bien réel.
    expect(SCAN_EVENT.request).toBeUndefined();
    expect(context.requestMethod).toBe("POST");
    expect(context.requestUrl).toBe("https://the-playground.fr/");
  });

  it("accepte aussi une requête fournie à la racine par les autres endpoints", () => {
    const ctx = extractEventContext({
      eventID: "x",
      title: "t",
      tags: [],
      entries: [],
      request: { url: "https://the-playground.fr/m/x", method: "GET", headers: [["User-Agent", "curl/8"]] },
    });
    expect(ctx.requestMethod).toBe("GET");
    expect(ctx.requestHeaders["user-agent"]).toBe("curl/8");
  });

  it("plafonne la longueur d'un en-tête pour ne pas gonfler le prompt", () => {
    const ctx = extractEventContext({
      ...SCAN_EVENT,
      entries: [{ type: "request", data: { headers: [["User-Agent", "A".repeat(500)]] } }],
    });
    expect(ctx.requestHeaders["user-agent"]).toHaveLength(200);
  });

  it("survit à un événement sans en-têtes ni entrées", () => {
    const ctx = extractEventContext({ eventID: "x", title: "t", tags: [], entries: [] });
    expect(ctx.requestHeaders).toEqual({});
    expect(ctx.stacktrace).toBe("");
  });

  it("ignore une forme d'en-têtes inattendue sans planter", () => {
    const ctx = extractEventContext({
      ...SCAN_EVENT,
      // L'API pourrait renvoyer un objet plutôt qu'un tableau de paires.
      entries: [{ type: "request", data: { headers: { "user-agent": "curl" } as never } }],
    });
    expect(ctx.requestHeaders).toEqual({});
  });
});

describe("buildAnalysisPrompt", () => {
  it("transmet au modèle les signaux qui manquaient sur THE-PLAYGROUND-2P", () => {
    const prompt = buildAnalysisPrompt(
      {
        issueShortId: "THE-PLAYGROUND-2P",
        issueTitle: "Error: Failed to find Server Action.",
        culprit: "/[locale]/page",
        level: "error",
        platform: "node",
        metadata: { type: "Error" },
      },
      { ...extractEventContext(SCAN_EVENT), eventCount: 8, userCount: 0 }
    );

    // Le faisceau « scanner » : réseau d'origine, corps multipart, volumétrie.
    expect(prompt).toContain("55286");
    expect(prompt).toContain("multipart/form-data");
    expect(prompt).toContain("8 occurrence(s), 0 utilisateur(s)");
    // Les tags de client, absents de la liste blanche d'origine.
    expect(prompt).toContain("browser=Chrome 152.0.0");
    expect(prompt).toContain("handled=no");
    // Le droit à l'abstention, et la clé de lecture de cette famille d'erreurs.
    expect(prompt).toContain("confidence");
    expect(prompt).toContain("incertain");
    expect(prompt).toContain("Failed to find Server Action");
  });

  it("indique franchement l'absence de contexte plutôt que de laisser un trou", () => {
    const prompt = buildAnalysisPrompt(
      {
        issueShortId: "X-1",
        issueTitle: "Boom",
        culprit: "job",
        level: "error",
        platform: "node",
        metadata: {},
      },
      { stacktrace: "", tags: {}, requestHeaders: {} }
    );
    expect(prompt).toContain("(aucun en-tête disponible)");
    expect(prompt).toContain("(compteurs indisponibles)");
  });
});

describe("ROUTE_MAP", () => {
  /**
   * Garde-fou : une carte périmée ment au modèle avec autant d'aplomb que
   * l'absence de carte. Ce test a déjà servi une fois, en attrapant `/c/[slug]`
   * là où les Communautés vivent sous `/circles/[slug]`.
   */
  it("ne cite que des routes qui existent encore", () => {
    const repoRoot = path.resolve(__dirname, "../../../../..");
    const missing = ROUTE_MAP.filter((route) => !existsSync(path.join(repoRoot, route.source)));
    expect(missing.map((r) => r.source)).toEqual([]);
  });
});
