import { describe, expect, it } from "vitest";

import { evaluatePurge, PURGE_ENV_FLAG } from "../../../tests/e2e/purge-guard";

/**
 * URL au format RÉEL de Neon : elle porte l'identifiant d'endpoint
 * auto-généré, jamais le nom de la branche. Aucune décision de sûreté ne doit
 * en dépendre — la version initiale du garde-fou y cherchait `e2e-<run_id>`,
 * qui n'y figure jamais, si bien que la purge n'aurait jamais tourné.
 */
const NEON_URL =
  "postgresql://neondb_owner:npg_secret@ep-shiny-surf-altm3fsn-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require";

const IN_CI = {
  githubActions: "true",
  allowFlag: "1",
  vercelEnv: undefined,
  databaseUrl: NEON_URL,
};

describe("evaluatePurge", () => {
  describe("given un job GitHub Actions avec l'intention explicite", () => {
    it("should autoriser la purge", () => {
      expect(evaluatePurge(IN_CI)).toEqual({ allowed: true, intended: true });
    });

    it("should accepter les variantes de casse et d'espaces du drapeau", () => {
      for (const flag of ["1", "true", "TRUE", " true "]) {
        expect(evaluatePurge({ ...IN_CI, allowFlag: flag }).allowed).toBe(true);
      }
    });
  });

  describe("given un poste de développement", () => {
    // Le cas qui compte : `pnpm test:e2e` en local vise la base de dev.
    // Aucune combinaison ne doit pouvoir la purger.
    it("should refuser même avec l'intention explicite", () => {
      const decision = evaluatePurge({ ...IN_CI, githubActions: undefined });
      expect(decision.allowed).toBe(false);
      expect(decision.intended).toBe(true);
      expect(decision.reason).toContain("hors GitHub Actions");
    });

    it("should refuser quelle que soit l'URL de la base", () => {
      for (const url of [
        NEON_URL,
        // Pièges de l'ancienne implémentation : `e2e-<chiffres>` dans le mot
        // de passe ou les paramètres levait le verrou.
        "postgresql://user:s3cret-e2e-1@ep-dev-branch.eu.neon.tech/neondb",
        "postgresql://user:pass@ep-dev.eu.neon.tech/neondb?application_name=e2e-1",
      ]) {
        expect(
          evaluatePurge({ ...IN_CI, githubActions: undefined, databaseUrl: url }).allowed
        ).toBe(false);
      }
    });
  });

  describe("given la production", () => {
    it("should refuser quoi qu'il arrive", () => {
      const decision = evaluatePurge({ ...IN_CI, vercelEnv: "production" });
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe("environnement de production");
    });
  });

  describe("given une intention absente ou ambiguë", () => {
    it.each([undefined, "", "0", "yes", "oui", "false"])(
      `should refuser et ne PAS signaler d'intention quand ${PURGE_ENV_FLAG} vaut %j`,
      (flag) => {
        const decision = evaluatePurge({ ...IN_CI, allowFlag: flag });
        expect(decision.allowed).toBe(false);
        // `intended: false` empêche le setup d'échouer bruyamment : en local,
        // une purge non demandée est simplement ignorée.
        expect(decision.intended).toBe(false);
      }
    );
  });

  describe("given une URL absente", () => {
    it.each([undefined, "", "   "])("should refuser (%j)", (url) => {
      expect(evaluatePurge({ ...IN_CI, databaseUrl: url }).allowed).toBe(false);
    });
  });
});
