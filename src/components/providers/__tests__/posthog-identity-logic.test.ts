import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearLastIdentifiedUserId,
  decideIdentityAction,
  readLastIdentifiedUserId,
  writeLastIdentifiedUserId,
} from "../posthog-identity-logic";

describe("decideIdentityAction", () => {
  describe("given un visiteur anonyme", () => {
    it("ne fait rien s'il n'a jamais été identifié (préserve l'identité anonyme)", () => {
      expect(decideIdentityAction(null, null)).toEqual({ type: "none" });
    });

    it("reset s'il était identifié auparavant (vraie déconnexion)", () => {
      expect(decideIdentityAction(null, "user-A")).toEqual({ type: "reset" });
    });
  });

  describe("given un utilisateur connecté", () => {
    it("identifie un nouvel utilisateur connecté (aucun identifié auparavant)", () => {
      expect(decideIdentityAction("user-A", null)).toEqual({
        type: "identify",
        userId: "user-A",
      });
    });

    it("ne fait rien si l'utilisateur est déjà identifié (navigation/reload)", () => {
      expect(decideIdentityAction("user-A", "user-A")).toEqual({ type: "none" });
    });

    it("réidentifie lors d'un changement de compte", () => {
      expect(decideIdentityAction("user-B", "user-A")).toEqual({
        type: "identify",
        userId: "user-B",
      });
    });
  });
});

describe("helpers localStorage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubStorage() {
    const store = new Map<string, string>();
    const localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
    vi.stubGlobal("window", { localStorage });
    return store;
  }

  it("écrit puis relit le dernier user identifié", () => {
    stubStorage();
    writeLastIdentifiedUserId("user-A");
    expect(readLastIdentifiedUserId()).toBe("user-A");
  });

  it("efface le dernier user identifié", () => {
    stubStorage();
    writeLastIdentifiedUserId("user-A");
    clearLastIdentifiedUserId();
    expect(readLastIdentifiedUserId()).toBeNull();
  });

  it("retourne null quand window/localStorage est indisponible (SSR)", () => {
    // window non stubbé -> accès à window lève -> dégradation vers null
    expect(readLastIdentifiedUserId()).toBeNull();
  });

  it("ne lève pas si localStorage.setItem échoue (navigation privée, quota)", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => null,
        setItem: () => {
          throw new Error("QuotaExceededError");
        },
        removeItem: () => {
          throw new Error("blocked");
        },
      },
    });
    expect(() => writeLastIdentifiedUserId("user-A")).not.toThrow();
    expect(() => clearLastIdentifiedUserId()).not.toThrow();
  });
});
