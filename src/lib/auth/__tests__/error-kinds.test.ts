import { describe, it, expect } from "vitest";
import {
  authErrorCodeFromMessage,
  classifyAuthError,
  isAlwaysDuplicateRejectionCode,
  normalizeAuthErrorCode,
  resolveAuthErrorCode,
} from "@/lib/auth/error-kinds";

describe("classifyAuthError", () => {
  describe("given a code that occurs in normal user flows", () => {
    it.each(["Verification", "UnknownAction", "AccessDenied"])(
      "should classify %s as expected_user_flow",
      (code) => {
        expect(classifyAuthError(code)).toBe("expected_user_flow");
      }
    );
  });

  describe("given an unfamiliar or unset code", () => {
    it.each(["Configuration", "AdapterError", "JWTSessionError", "RandomThing"])(
      "should classify %s as unexpected",
      (code) => {
        expect(classifyAuthError(code)).toBe("unexpected");
      }
    );

    it("should classify null as unexpected", () => {
      expect(classifyAuthError(null)).toBe("unexpected");
    });

    it("should classify undefined as unexpected", () => {
      expect(classifyAuthError(undefined)).toBe("unexpected");
    });
  });

  describe("given a code prefixed with extra information", () => {
    it("should normalize before classifying", () => {
      expect(classifyAuthError("Verification: token expired")).toBe(
        "expected_user_flow"
      );
    });
  });
});

describe("normalizeAuthErrorCode", () => {
  describe("given a known Auth.js error code", () => {
    it.each([
      "Verification",
      "AccessDenied",
      "UnknownAction",
      "Configuration",
      "OAuthAccountNotLinked",
      "OAuthCallbackError",
      "OAuthSignInError",
      "Default",
    ])("should keep %s as-is", (code) => {
      expect(normalizeAuthErrorCode(code)).toBe(code);
    });

    it("should strip extra information after the colon", () => {
      expect(normalizeAuthErrorCode("Verification: token expired")).toBe(
        "Verification"
      );
    });
  });

  describe("given a user-controlled or unset value", () => {
    it.each([
      "CredentialsSignin",
      "<script>alert(1)</script>",
      "x".repeat(300),
    ])("should bucket %s under Unknown to bound Sentry tag cardinality", (code) => {
      expect(normalizeAuthErrorCode(code)).toBe("Unknown");
    });

    it("should return Unknown for null", () => {
      expect(normalizeAuthErrorCode(null)).toBe("Unknown");
    });

    it("should return Unknown for undefined", () => {
      expect(normalizeAuthErrorCode(undefined)).toBe("Unknown");
    });
  });
});

describe("authErrorCodeFromMessage", () => {
  describe("given un message @auth/core portant un hash de code connu", () => {
    it.each([
      ["AccessDenied. Read more at https://errors.authjs.dev#accessdenied", "AccessDenied"],
      ["Verification. Read more at https://errors.authjs.dev#verification", "Verification"],
      ["Configuration. Read more at https://errors.authjs.dev#configuration", "Configuration"],
      ["Read more at HTTPS://ERRORS.AUTHJS.DEV#ACCESSDENIED", "AccessDenied"], // insensible à la casse
    ])("should extraire le code canonique de %s", (message, expected) => {
      expect(authErrorCodeFromMessage(message)).toBe(expected);
    });
  });

  describe("given un message @auth/core dont le hash n'est pas dans la map", () => {
    // Préserve le code exact (panne infra triable) plutôt que de le perdre.
    it.each([
      ["AdapterError. Read more at https://errors.authjs.dev#adaptererror", "adaptererror"],
      ["Read more at https://errors.authjs.dev#jwtsessionerror", "jwtsessionerror"],
      ["errors.authjs.dev#somethingunknown", "somethingunknown"],
    ])("should renvoyer le hash brut pour %s", (message, expected) => {
      expect(authErrorCodeFromMessage(message)).toBe(expected);
    });
  });

  describe("given un message sans hash @auth/core", () => {
    it.each([
      "TypeError: cannot read properties of undefined",
      "Database connection failed",
      "",
    ])("should renvoyer undefined pour %s", (message) => {
      expect(authErrorCodeFromMessage(message)).toBeUndefined();
    });

    it.each([null, undefined])("should gérer %s sans lever", (message) => {
      expect(authErrorCodeFromMessage(message)).toBeUndefined();
    });
  });

});

// Exerce le VRAI chemin de résolution utilisé par le logger d'auth.config
// (pas une réimplémentation du fallback) : un changement d'ordre de priorité
// dans resolveAuthErrorCode casse ces tests.
describe("resolveAuthErrorCode", () => {
  // Régression : en prod, `error.name` est minifié (« AccessDenied » -> « v »),
  // mais le message porte toujours le code canonique. La résolution doit donc
  // privilégier le message pour éviter les fausses alertes error-level.
  it("should privilégier le code du message quand error.name est minifié", () => {
    const error = {
      name: "v",
      message:
        "AccessDenied. Read more at https://errors.authjs.dev#accessdenied",
    };
    expect(resolveAuthErrorCode(error)).toBe("AccessDenied");
    expect(classifyAuthError(resolveAuthErrorCode(error))).toBe(
      "expected_user_flow"
    );
  });

  // Régression (review #2) : une vraie panne infra (#adaptererror) ne doit PAS
  // se collapser sous « Unknown » ; on garde le code exact, classé unexpected.
  it("should préserver le code d'une panne infra @auth/core", () => {
    const error = {
      name: "v",
      message: "AdapterError. Read more at https://errors.authjs.dev#adaptererror",
    };
    expect(resolveAuthErrorCode(error)).toBe("adaptererror");
    expect(classifyAuthError(resolveAuthErrorCode(error))).toBe("unexpected");
  });

  it("should normaliser le repli sur error.name minifié sous Unknown (cardinalité)", () => {
    // Pas de hash @auth/core dans le message -> repli normalisé sur error.name.
    const error = { name: "v", message: "boom" };
    expect(resolveAuthErrorCode(error)).toBe("Unknown");
  });

  it.each([{}, null, undefined])(
    "should renvoyer Unknown sans name ni message exploitable (%o)",
    (error) => {
      expect(resolveAuthErrorCode(error)).toBe("Unknown");
    }
  );
});

describe("isAlwaysDuplicateRejectionCode", () => {
  it("should reconnaître AccessDenied (doublon d'une capture délibérée)", () => {
    expect(isAlwaysDuplicateRejectionCode("AccessDenied")).toBe(true);
  });

  it.each(["Verification", "adaptererror", "Unknown", null, undefined])(
    "should renvoyer false pour %s",
    (code) => {
      expect(isAlwaysDuplicateRejectionCode(code)).toBe(false);
    }
  );
});
