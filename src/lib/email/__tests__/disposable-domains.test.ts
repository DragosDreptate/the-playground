import { describe, it, expect } from "vitest";
import {
  isDisposableEmailDomain,
  isDisposableEmailDomainWith,
} from "@/lib/email/disposable-domains";

describe("isDisposableEmailDomain", () => {
  describe("given a disposable email domain", () => {
    it.each([
      "user@ibymail.com", // blocklist custom (incident 14/06/2026)
      "user@tempmail.ing", // provider tempmail.ing
      "user@tempmail101.com",
      "USER@IBYMAIL.COM", // insensible à la casse
      "user@mailinator.com", // présent dans la liste du package
      "user@guerrillamail.com",
      "user@mail.ibymail.com", // sous-domaine d'un domaine jetable
      "user@x.y.mailinator.com", // sous-domaine profond
      "user@ibymail.com.", // forme FQDN (point final)
    ])("should flag %s as disposable", (email) => {
      expect(isDisposableEmailDomain(email)).toBe(true);
    });
  });

  describe("given a legitimate email domain", () => {
    it.each([
      "user@gmail.com",
      "user@outlook.com",
      "user@proton.me",
      "user@interieur.gouv.fr",
      "user@yahoo.fr",
      "user@capgemini.com",
      "user@mail.gmail.com", // sous-domaine d'un domaine légitime : pas de faux positif
    ])("should not flag %s", (email) => {
      expect(isDisposableEmailDomain(email)).toBe(false);
    });
  });

  describe("given a malformed input", () => {
    it.each(["not-an-email", "", "@", "user@"])(
      "should return false for %s",
      (email) => {
        expect(isDisposableEmailDomain(email)).toBe(false);
      }
    );
  });
});

describe("isDisposableEmailDomainWith", () => {
  const extras = ["evil-temp.test", "Throwaway.IO"];

  describe("given un domaine dynamique supplémentaire", () => {
    it.each([
      "user@evil-temp.test", // domaine exact ajouté dynamiquement
      "user@sub.evil-temp.test", // sous-domaine via suffix-walk
      "USER@THROWAWAY.IO", // normalisation casse de la surcouche
    ])("should flag %s as disposable", (email) => {
      expect(isDisposableEmailDomainWith(email, extras)).toBe(true);
    });
  });

  describe("given la baseline statique", () => {
    it("should rester active même avec une surcouche vide", () => {
      expect(isDisposableEmailDomainWith("user@ibymail.com", [])).toBe(true);
    });
  });

  describe("given un domaine légitime hors surcouche", () => {
    it("should ne pas flaguer", () => {
      expect(isDisposableEmailDomainWith("user@gmail.com", extras)).toBe(false);
    });
  });
});
