import { describe, expect, it, vi } from "vitest";

// L'environnement vitest (node) ne résout pas `next/server`. On mocke les
// dépendances `next` du module middleware pour pouvoir importer son `config`
// réel et tester le matcher (source de vérité, sans duplication).
vi.mock("next/server", () => ({
  NextResponse: { next: () => ({}), redirect: () => ({}) },
}));
vi.mock("next-intl/middleware", () => ({
  default: () => () => ({}),
}));

import { config } from "@/middleware";

// Verrouille le matcher du middleware next-intl. Régression critique couverte :
// le proxy Vercel BotID (`/149e9513-.../...`, challenge servi en first-party)
// NE DOIT PAS passer par next-intl, sinon ses appels sans extension renvoient
// 404 et cassent le challenge (faux positifs + latence au sign-in). Les vraies
// routes de l'app doivent au contraire toujours être prises en charge.
describe("middleware matcher", () => {
  const matcher = new RegExp(`^${config.matcher[0]}$`);

  it.each([
    // Proxy BotID — doit être IGNORÉ par le middleware
    ["/149e9513-01fa-4fb0-aad4-566afd725d1b/2d206a39/proxy/x", false],
    ["/149e9513-01fa-4fb0-aad4-566afd725d1b/abc/c.js", false],
    // Infra technique — ignorée
    ["/api/auth/session", false],
    ["/_next/static/chunk.js", false],
    ["/monitoring", false],
    // Vraies routes app — le middleware DOIT tourner (i18n, gardes)
    ["/", true],
    ["/auth/sign-in", true],
    ["/en/auth/sign-in", true],
    ["/fr/circles/mon-cercle", true],
    ["/dashboard", true],
  ])("%s -> middleware actif = %s", (path, shouldRun) => {
    expect(matcher.test(path)).toBe(shouldRun);
  });
});
