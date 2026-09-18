import { describe, expect, it } from "vitest";

import { evaluatePurge, PURGE_ENV_FLAG } from "../../../tests/e2e/purge-guard";

/** Branche éphémère telle que la CI la nomme : e2e-<run_id>-<attempt>. */
const CI_URL = "postgres://u:p@ep-cool-name-e2e-35275648244-1.eu-central-1.aws.neon.tech/neondb";
const DEV_URL = "postgres://u:p@ep-dev-branch-123456.eu-central-1.aws.neon.tech/neondb";

const ALLOWED = { databaseUrl: CI_URL, allowFlag: "1", vercelEnv: undefined };

describe("evaluatePurge", () => {
  describe("given une branche éphémère de CI avec l'intention explicite", () => {
    it("should autoriser la purge", () => {
      expect(evaluatePurge(ALLOWED)).toEqual({ allowed: true });
    });

    it("should accepter aussi la valeur \"true\" pour le drapeau", () => {
      expect(evaluatePurge({ ...ALLOWED, allowFlag: "true" }).allowed).toBe(true);
    });
  });

  describe("given la base de développement", () => {
    // Le cas qui compte : en local, `pnpm test:e2e` pointe ici. Une purge
    // y effacerait le travail en cours.
    it("should refuser, même avec l'intention explicite", () => {
      const decision = evaluatePurge({ ...ALLOWED, databaseUrl: DEV_URL });
      expect(decision.allowed).toBe(false);
      expect(decision).toMatchObject({ reason: expect.stringContaining("éphémère") });
    });
  });

  describe("given la production", () => {
    it("should refuser quoi qu'il arrive", () => {
      const decision = evaluatePurge({ ...ALLOWED, vercelEnv: "production" });
      expect(decision).toEqual({ allowed: false, reason: "environnement de production" });
    });
  });

  describe("given une intention absente ou ambiguë", () => {
    it.each([undefined, "", "0", "yes", "oui", "TRUE "])(
      `should refuser quand ${PURGE_ENV_FLAG} vaut %j`,
      (flag) => {
        expect(evaluatePurge({ ...ALLOWED, allowFlag: flag }).allowed).toBe(false);
      }
    );
  });

  describe("given une URL absente ou vide", () => {
    it.each([undefined, "", "   "])("should refuser (%j)", (url) => {
      expect(evaluatePurge({ ...ALLOWED, databaseUrl: url }).allowed).toBe(false);
    });
  });

  describe("given une URL qui ressemble à une branche e2e sans en être une", () => {
    it.each([
      "postgres://u:p@ep-preprod-e2e.eu.neon.tech/neondb",
      "postgres://u:p@ep-my-e2e-playground.eu.neon.tech/neondb",
      "postgres://u:p@ep-staging.eu.neon.tech/neondb?options=e2e",
    ])("should refuser (%s)", (url) => {
      // `e2e-` doit être suivi d'un identifiant de run numérique.
      expect(evaluatePurge({ ...ALLOWED, databaseUrl: url }).allowed).toBe(false);
    });
  });
});
