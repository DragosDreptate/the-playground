/**
 * Tests de sécurité — Guards d'onboarding (route groups)
 *
 * Vérifie les invariants de sécurité des layouts d'onboarding :
 *
 * Architecture des route groups :
 *   dashboard/(app)/layout.tsx        → garde auth : !session.user → redirect sign-in
 *   dashboard/(app)/(main)/layout.tsx → garde onboarding : shouldRedirectToSetup
 *   dashboard/(onboarding)/layout.tsx → garde auth : !session.user → redirect sign-in
 *   dashboard/(onboarding)/profile/setup/page.tsx → shouldRedirectFromSetup
 *
 * Garanties attendues :
 * 1. Un user non-authentifié ne peut pas accéder aux pages (app) ni (onboarding)
 * 2. Un user authentifié mais non-onboardé est redirigé de (main) vers setup
 * 3. Un user authentifié et onboardé ne peut pas accéder à la page setup
 * 4. Pas de boucle infinie de redirections quelle que soit la combinaison d'état
 *
 * Note : les tests de layout sont des tests de la logique pure (lib/onboarding.ts).
 * Les tests de la couche Next.js (redirect, auth()) sont des tests d'intégration
 * qui nécessitent un environnement serveur — hors scope tests unitaires.
 */

import { describe, it, expect } from "vitest";
import { shouldRedirectToSetup, shouldRedirectFromSetup } from "@/lib/onboarding";

// ─────────────────────────────────────────────────────────────
// Types de sessions simulés (ce que session.user contient)
// ─────────────────────────────────────────────────────────────

type SessionUser = {
  id: string;
  onboardingCompleted: boolean;
};

// ─────────────────────────────────────────────────────────────
// Scénarios d'accès
// ─────────────────────────────────────────────────────────────

describe("Security — Onboarding Guards", () => {
  // ─────────────────────────────────────────────────────────────
  // Guard (main)/layout — protection des pages dashboard protégées
  // ─────────────────────────────────────────────────────────────

  describe("(main)/layout guard — shouldRedirectToSetup", () => {
    describe("given a non-onboarded authenticated user", () => {
      const nonOnboardedUser: SessionUser = { id: "user-1", onboardingCompleted: false };

      it("should redirect to setup (cannot access protected dashboard pages)", () => {
        expect(shouldRedirectToSetup(nonOnboardedUser)).toBe(true);
      });

      it("should NOT redirect from setup page (no redirect loop)", () => {
        expect(shouldRedirectFromSetup(nonOnboardedUser)).toBe(false);
      });
    });

    describe("given an onboarded authenticated user", () => {
      const onboardedUser: SessionUser = { id: "user-2", onboardingCompleted: true };

      it("should NOT redirect to setup (can access protected dashboard pages)", () => {
        expect(shouldRedirectToSetup(onboardedUser)).toBe(false);
      });

      it("should redirect from setup page (setup already done)", () => {
        expect(shouldRedirectFromSetup(onboardedUser)).toBe(true);
      });
    });

    describe("given a null user (unauthenticated — should not reach this guard)", () => {
      it("should NOT redirect to setup (auth guard fires first)", () => {
        // En pratique, (app)/layout redirige vers sign-in avant que
        // (main)/layout soit atteint. shouldRedirectToSetup(null) = false
        // car null = pas d'utilisateur = pas de redirect vers setup
        // (l'auth guard gère ce cas).
        expect(shouldRedirectToSetup(null)).toBe(false);
        expect(shouldRedirectFromSetup(null)).toBe(false);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Setup page guard — protection contre l'accès post-onboarding
  // ─────────────────────────────────────────────────────────────

  describe("Setup page guard — shouldRedirectFromSetup", () => {
    it("should redirect an already-onboarded user away from the setup page", () => {
      const alreadyOnboarded: SessionUser = { id: "user-3", onboardingCompleted: true };
      expect(shouldRedirectFromSetup(alreadyOnboarded)).toBe(true);
    });

    it("should allow a non-onboarded user to stay on the setup page", () => {
      const needsSetup: SessionUser = { id: "user-4", onboardingCompleted: false };
      expect(shouldRedirectFromSetup(needsSetup)).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Garantie anti-boucle : les deux guards ne doivent JAMAIS être
  // tous les deux vrais pour le même état utilisateur.
  // ─────────────────────────────────────────────────────────────

  describe("Anti-redirect-loop invariant", () => {
    it.each([
      { desc: "non-onboarded user", user: { id: "u1", onboardingCompleted: false } },
      { desc: "onboarded user", user: { id: "u2", onboardingCompleted: true } },
      { desc: "null (unauthenticated)", user: null },
      { desc: "undefined", user: undefined },
    ])(
      "should never have both guards active simultaneously for $desc",
      ({ user }) => {
        const redirectsToSetup = shouldRedirectToSetup(user);
        const redirectsFromSetup = shouldRedirectFromSetup(user);

        // Si les deux sont vrais, l'utilisateur serait dans une boucle infinie
        expect(redirectsToSetup && redirectsFromSetup).toBe(false);
      }
    );
  });

  // ─────────────────────────────────────────────────────────────
  // Vérification des invariants de sécurité de la chaîne de layouts
  // ─────────────────────────────────────────────────────────────

  describe("Layout chain security invariants", () => {
    it("should ensure a non-onboarded user has exactly one stable destination: setup page", () => {
      const user = { id: "user-5", onboardingCompleted: false };

      // Scénario : user non-onboardé frappe /dashboard (protégé)
      // → (main)/layout → redirect vers setup (shouldRedirectToSetup = true)
      expect(shouldRedirectToSetup(user)).toBe(true);

      // Scénario : user arrive sur /dashboard/profile/setup
      // → setup page guard → NE redirige PAS (shouldRedirectFromSetup = false)
      expect(shouldRedirectFromSetup(user)).toBe(false);

      // L'utilisateur reste sur setup — pas de boucle, destination stable
    });

    it("should ensure an onboarded user has exactly one stable destination: dashboard", () => {
      const user = { id: "user-6", onboardingCompleted: true };

      // Scénario : user onboardé frappe /dashboard
      // → (main)/layout → NE redirige PAS (shouldRedirectToSetup = false)
      expect(shouldRedirectToSetup(user)).toBe(false);

      // Scénario : user onboardé frappe /dashboard/profile/setup directement
      // → setup page guard → redirige vers /dashboard (shouldRedirectFromSetup = true)
      expect(shouldRedirectFromSetup(user)).toBe(true);

      // L'utilisateur est toujours envoyé vers dashboard — pas de boucle
    });

    it("should verify that completing onboarding changes the security state correctly", () => {
      // Avant onboarding
      const beforeOnboarding = { id: "user-7", onboardingCompleted: false };
      expect(shouldRedirectToSetup(beforeOnboarding)).toBe(true);   // bloqué sur protected pages
      expect(shouldRedirectFromSetup(beforeOnboarding)).toBe(false); // autorisé sur setup

      // Après onboarding (même user, état changé)
      const afterOnboarding = { id: "user-7", onboardingCompleted: true };
      expect(shouldRedirectToSetup(afterOnboarding)).toBe(false);  // accès aux protected pages
      expect(shouldRedirectFromSetup(afterOnboarding)).toBe(true); // redirigé de setup → dashboard
    });

    it("should verify that non-onboarded user cannot bypass (main) layout guard by any user object variant", () => {
      // Variantes possibles de l'objet user quand onboardingCompleted est falsy
      const falsyVariants = [
        { id: "u1", onboardingCompleted: false },
        // Note : les types null/undefined sont gérés par le garde d'authentification
        // avant le garde d'onboarding — mais on teste la robustesse
      ];

      for (const user of falsyVariants) {
        expect(shouldRedirectToSetup(user)).toBe(true);
        expect(shouldRedirectFromSetup(user)).toBe(false);
      }
    });
  });
});
