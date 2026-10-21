import { describe, it, expect } from "vitest";
import { getAllPosts, getRelatedPosts } from "@/lib/blog";

// S'appuie sur les vrais articles de src/content/blog : le maillage interne
// dépend de leurs keywords, c'est ce contrat qu'on vérifie.
describe("getRelatedPosts", () => {
  describe.each(["fr", "en"])("given an existing post in %s", (locale) => {
    const [first] = getAllPosts(locale);

    it("returns up to 3 posts, never the current one", () => {
      const related = getRelatedPosts(first.slug, locale);
      expect(related).toHaveLength(3);
      expect(related.map((post) => post.slug)).not.toContain(first.slug);
    });
  });

  describe("given a post sharing keyword terms with another", () => {
    it("ranks the closest post first (Meetup alternatives → Meetup vs Luma comparison)", () => {
      const related = getRelatedPosts("alternative-meetup-gratuite", "fr");
      expect(related.map((post) => post.slug)).toContain(
        "meetup-vs-luma-vs-the-playground",
      );
    });
  });

  describe("given an unknown slug", () => {
    it("returns no related post", () => {
      expect(getRelatedPosts("n-existe-pas", "fr")).toEqual([]);
    });
  });
});
