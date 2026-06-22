import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  checkBlockedSignIn,
  coerceBlocklist,
  matchIdentityReason,
  type DynamicBlocklist,
} from "@/infrastructure/auth/dynamic-blocklist";

const getMock = vi.fn();
vi.mock("@vercel/edge-config", () => ({
  get: (...args: unknown[]) => getMock(...args),
}));

const blocklist = (over: Partial<DynamicBlocklist> = {}): DynamicBlocklist => ({
  emails: [],
  oauthIds: [],
  domains: [],
  ...over,
});

describe("matchIdentityReason", () => {
  describe("given un email présent dans la surcouche dynamique", () => {
    it("should renvoyer 'email', insensible à la casse et aux espaces", () => {
      const data = blocklist({ emails: ["ln941535@mailsecondary.com"] });
      expect(
        matchIdentityReason(data, { email: "  LN941535@MailSecondary.com  " })
      ).toBe("email");
    });
  });

  describe("given un email ET un oauthId tous deux bloqués", () => {
    it("should renvoyer 'email' (prioritaire)", () => {
      const data = blocklist({ emails: ["a@b.com"], oauthIds: ["x"] });
      expect(matchIdentityReason(data, { email: "A@B.com", oauthId: "x" })).toBe(
        "email"
      );
    });
  });

  describe("given un providerAccountId présent (sans email bloqué)", () => {
    it("should renvoyer 'oauth' sur correspondance exacte", () => {
      const data = blocklist({ oauthIds: ["113146911556107410982"] });
      expect(
        matchIdentityReason(data, {
          email: "legit@gmail.com",
          oauthId: "113146911556107410982",
        })
      ).toBe("oauth");
    });
  });

  describe("given une identité absente de la surcouche", () => {
    it("should renvoyer null", () => {
      const data = blocklist({ emails: ["someone@evil.test"] });
      expect(
        matchIdentityReason(data, { email: "legit@gmail.com", oauthId: "999" })
      ).toBeNull();
    });
  });

  describe("given une identité sans email ni oauthId", () => {
    it("should renvoyer null (pas de faux positif sur null)", () => {
      const data = blocklist({ emails: ["a@b.com"], oauthIds: ["x"] });
      expect(matchIdentityReason(data, {})).toBeNull();
      expect(
        matchIdentityReason(data, { email: null, oauthId: null })
      ).toBeNull();
    });
  });
});

describe("coerceBlocklist", () => {
  describe("given une valeur absente ou non-objet", () => {
    it.each([undefined, null, "oops", 42])(
      "should retourner une blocklist vide pour %s",
      (value) => {
        expect(coerceBlocklist(value)).toEqual(blocklist());
      }
    );
  });

  describe("given des champs non-array (édition manuelle corrompue)", () => {
    it("should retomber sur des tableaux vides", () => {
      expect(
        coerceBlocklist({ emails: "x@y.com", oauthIds: {}, domains: 1 })
      ).toEqual(blocklist());
    });
  });

  describe("given des éléments non-string dans les tableaux", () => {
    it("should les filtrer pour ne garder que les strings", () => {
      expect(
        coerceBlocklist({ emails: ["a@b.com", null, 5, "c@d.com"] })
      ).toEqual(blocklist({ emails: ["a@b.com", "c@d.com"] }));
    });
  });
});

describe("checkBlockedSignIn", () => {
  const ORIGINAL_EDGE_CONFIG = process.env.EDGE_CONFIG;

  beforeEach(() => {
    getMock.mockReset();
    process.env.EDGE_CONFIG = "edge-config-connection-string";
  });

  afterEach(() => {
    if (ORIGINAL_EDGE_CONFIG === undefined) delete process.env.EDGE_CONFIG;
    else process.env.EDGE_CONFIG = ORIGINAL_EDGE_CONFIG;
  });

  describe("raison du blocage", () => {
    it("should renvoyer 'static' pour une entrée de la baseline du code", async () => {
      // Email présent dans sign-in-blocklist.ts (baseline statique).
      expect(await checkBlockedSignIn("ixewufoy22@gmail.com")).toBe("static");
      expect(getMock).not.toHaveBeenCalled(); // court-circuite Edge Config
    });

    it("should renvoyer 'email' pour un email bloqué dynamiquement", async () => {
      getMock.mockResolvedValue({ emails: ["x@y.com"] });
      expect(await checkBlockedSignIn("X@Y.com")).toBe("email");
    });

    it("should renvoyer 'oauth' pour un providerAccountId bloqué", async () => {
      getMock.mockResolvedValue({ oauthIds: ["github-999"] });
      expect(await checkBlockedSignIn("whoever@gmail.com", "github-999")).toBe(
        "oauth"
      );
    });

    it("should renvoyer 'domain' pour un domaine bloqué (sous-domaine inclus)", async () => {
      getMock.mockResolvedValue({ domains: ["evil.com"] });
      // Pas de provider resend ici : couvre aussi le chemin OAuth.
      expect(await checkBlockedSignIn("attacker@evil.com", "google-123")).toBe(
        "domain"
      );
      expect(await checkBlockedSignIn("attacker@sub.evil.com")).toBe("domain");
    });

    it("should renvoyer null pour un acteur non bloqué", async () => {
      getMock.mockResolvedValue({ emails: ["someone@evil.test"] });
      expect(await checkBlockedSignIn("legit@gmail.com", "42")).toBeNull();
    });
  });

  describe("fail-open (jamais de lock-out)", () => {
    it("should ne pas lire Edge Config ni bloquer si EDGE_CONFIG absent (local)", async () => {
      delete process.env.EDGE_CONFIG;
      expect(await checkBlockedSignIn("legit@gmail.com", "42")).toBeNull();
      expect(getMock).not.toHaveBeenCalled();
    });

    it("should fail-open sur une lecture Edge Config en erreur", async () => {
      getMock.mockRejectedValue(new Error("edge config down"));
      expect(await checkBlockedSignIn("legit@gmail.com")).toBeNull();
    });

    it("should fail-open après le timeout si la lecture hang", async () => {
      vi.useFakeTimers();
      try {
        getMock.mockReturnValue(new Promise(() => {})); // ne se résout jamais
        const pending = checkBlockedSignIn("legit@gmail.com");
        await vi.advanceTimersByTimeAsync(800);
        expect(await pending).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("robustesse de la surcouche", () => {
    it("should coercer une entrée corrompue (email non-string) sans crasher", async () => {
      getMock.mockResolvedValue({ emails: [null, "x@y.com"] });
      expect(await checkBlockedSignIn("x@y.com")).toBe("email");
      expect(await checkBlockedSignIn("safe@gmail.com")).toBeNull();
    });
  });
});
