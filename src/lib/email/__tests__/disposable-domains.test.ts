import { describe, it, expect } from "vitest";
import {
  isDisposableEmailDomain,
  matchesDomainSuffix,
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

describe("matchesDomainSuffix", () => {
  const domains = ["evil-temp.test", "Throwaway.IO"]; // casse mélangée volontaire

  describe("given un email dont le domaine figure dans l'ensemble", () => {
    it.each([
      "user@evil-temp.test", // domaine exact
      "user@sub.evil-temp.test", // sous-domaine via suffix-walk
      "USER@THROWAWAY.IO", // normalisation casse des deux côtés
      "user@throwaway.io.", // forme FQDN (point final)
    ])("should match %s", (email) => {
      expect(matchesDomainSuffix(email, domains)).toBe(true);
    });
  });

  describe("given un email hors de l'ensemble", () => {
    it.each(["user@gmail.com", "user@evil-temp.com"])(
      "should not match %s",
      (email) => {
        expect(matchesDomainSuffix(email, domains)).toBe(false);
      }
    );
  });

  describe("given un ensemble vide ou un email malformé", () => {
    it("should ne jamais matcher", () => {
      expect(matchesDomainSuffix("user@evil-temp.test", [])).toBe(false);
      expect(matchesDomainSuffix("not-an-email", domains)).toBe(false);
    });
  });
});
