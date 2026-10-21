import { describe, it, expect } from "vitest";
import { getAllPosts, getRelatedPosts } from "@/lib/blog";

// S'appuie sur les vrais articles de src/content/blog : le maillage interne
// dépend de leurs keywords, c'est ce contrat qu'on vérifie.
describe("getRelatedPosts", () => {
  describe.each(["fr", "en"])("given the posts in %s", (locale) => {
    const posts = getAllPosts(locale);

    it.each(posts.map((post) => post.slug))(
      "returns 3 distinct posts for %s, never the post itself",
      (slug) => {
        const related = getRelatedPosts(slug, locale).map((post) => post.slug);
        expect(related).toHaveLength(3);
        expect(new Set(related).size).toBe(3);
        expect(related).not.toContain(slug);
      },
    );

    // Le but du bloc : aucun article orphelin, y compris celui qui ne partage
    // aucun mot-clé avec les autres.
    it("links every post from at least one other post", () => {
      const linked = new Set(
        posts.flatMap((post) => getRelatedPosts(post.slug, locale).map((r) => r.slug)),
      );
      expect([...linked].sort()).toEqual(posts.map((post) => post.slug).sort());
    });
  });

  describe("given a post sharing keyword terms with another", () => {
    it("includes the closest post (Meetup alternatives → Meetup vs Luma comparison)", () => {
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
