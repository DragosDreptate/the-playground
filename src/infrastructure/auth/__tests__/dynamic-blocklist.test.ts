import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  checkBlockedSignIn,
  coerceBlocklist,
  isBlockedSignIn,
  matchesIdentityBlocklist,
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

describe("matchesIdentityBlocklist", () => {
  describe("given un email présent dans la surcouche dynamique", () => {
    it("should bloquer, insensible à la casse et aux espaces", () => {
      const data = blocklist({ emails: ["ln941535@mailsecondary.com"] });
      expect(
        matchesIdentityBlocklist(data, { email: "  LN941535@MailSecondary.com  " })
      ).toBe(true);
    });
  });

  describe("given un providerAccountId présent", () => {
    it("should bloquer sur correspondance exacte", () => {
      const data = blocklist({ oauthIds: ["113146911556107410982"] });
      expect(
        matchesIdentityBlocklist(data, { oauthId: "113146911556107410982" })
      ).toBe(true);
    });
  });

  describe("given une identité absente de la surcouche", () => {
    it("should ne pas bloquer", () => {
      const data = blocklist({ emails: ["someone@evil.test"] });
      expect(
        matchesIdentityBlocklist(data, {
          email: "legit@gmail.com",
          oauthId: "999",
        })
      ).toBe(false);
    });
  });

  describe("given une identité sans email ni oauthId", () => {
    it("should ne pas bloquer (pas de faux positif sur null)", () => {
      const data = blocklist({ emails: ["a@b.com"], oauthIds: ["x"] });
      expect(matchesIdentityBlocklist(data, {})).toBe(false);
      expect(
        matchesIdentityBlocklist(data, { email: null, oauthId: null })
      ).toBe(false);
    });
  });
});

describe("matchIdentityReason", () => {
  it("should renvoyer 'email' sur correspondance email (prioritaire)", () => {
    const data = blocklist({ emails: ["a@b.com"], oauthIds: ["x"] });
    expect(matchIdentityReason(data, { email: "A@B.com", oauthId: "x" })).toBe(
      "email"
    );
  });

  it("should renvoyer 'oauth' quand seul l'oauthId matche", () => {
    const data = blocklist({ oauthIds: ["x"] });
    expect(
      matchIdentityReason(data, { email: "legit@gmail.com", oauthId: "x" })
    ).toBe("oauth");
  });

  it("should renvoyer null sans correspondance", () => {
    expect(matchIdentityReason(blocklist(), { email: "a@b.com" })).toBeNull();
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

describe("isBlockedSignIn", () => {
  const ORIGINAL_EDGE_CONFIG = process.env.EDGE_CONFIG;

  beforeEach(() => {
    getMock.mockReset();
    process.env.EDGE_CONFIG = "edge-config-connection-string";
  });

  afterEach(() => {
    if (ORIGINAL_EDGE_CONFIG === undefined) delete process.env.EDGE_CONFIG;
    else process.env.EDGE_CONFIG = ORIGINAL_EDGE_CONFIG;
  });

  describe("given EDGE_CONFIG absent (local)", () => {
    it("should fail-open : ne pas lire Edge Config, ne pas bloquer", async () => {
      delete process.env.EDGE_CONFIG;
      expect(await isBlockedSignIn("legit@gmail.com", "42")).toBe(false);
      expect(getMock).not.toHaveBeenCalled();
    });
  });

  describe("given une lecture Edge Config en erreur", () => {
    it("should fail-open (pas de lock-out)", async () => {
      getMock.mockRejectedValue(new Error("edge config down"));
      expect(await isBlockedSignIn("legit@gmail.com")).toBe(false);
    });
  });

  describe("given une lecture Edge Config qui hang", () => {
    it("should fail-open après le timeout (pas de connexion bloquée)", async () => {
      vi.useFakeTimers();
      try {
        getMock.mockReturnValue(new Promise(() => {})); // ne se résout jamais
        const pending = isBlockedSignIn("legit@gmail.com");
        await vi.advanceTimersByTimeAsync(800);
        expect(await pending).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("given un domaine bloqué dynamiquement", () => {
    it("should bloquer quel que soit le provider (OAuth inclus)", async () => {
      getMock.mockResolvedValue({ domains: ["evil.com"] });
      // Pas de provider/email resend ici : couvre le chemin OAuth.
      expect(await isBlockedSignIn("attacker@evil.com", "google-123")).toBe(true);
      expect(await isBlockedSignIn("attacker@sub.evil.com")).toBe(true);
    });
  });

  describe("given une surcouche corrompue (email non-string)", () => {
    it("should coercer sans crasher et bloquer les vraies entrées", async () => {
      getMock.mockResolvedValue({ emails: [null, "x@y.com"] });
      expect(await isBlockedSignIn("x@y.com")).toBe(true);
      expect(await isBlockedSignIn("safe@gmail.com")).toBe(false);
    });
  });

  describe("given un providerAccountId bloqué dynamiquement", () => {
    it("should bloquer", async () => {
      getMock.mockResolvedValue({ oauthIds: ["github-999"] });
      expect(await isBlockedSignIn("whoever@gmail.com", "github-999")).toBe(true);
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
    expect(await checkBlockedSignIn("attacker@sub.evil.com")).toBe("domain");
  });

  it("should renvoyer null pour un acteur non bloqué", async () => {
    getMock.mockResolvedValue({ emails: ["someone@evil.test"] });
    expect(await checkBlockedSignIn("legit@gmail.com", "42")).toBeNull();
  });
});
