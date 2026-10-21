import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";

const BLOG_DIR = join(process.cwd(), "src/content/blog");

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string;
  keywords: string[];
  author: string;
  content: string;
};

export type BlogPostMeta = Omit<BlogPost, "content">;

function parseFrontmatter(
  fileContent: string,
  slug: string,
): BlogPostMeta | null {
  try {
    const { data } = matter(fileContent);
    if (!data.title || !data.description || !data.date) return null;
    return {
      slug,
      title: data.title,
      description: data.description,
      date: data.date,
      keywords: data.keywords ?? [],
      author: data.author ?? "The Playground",
    };
  } catch {
    return null;
  }
}

async function compileMarkdown(markdown: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(markdown);
  return String(result);
}

export function getAllPosts(locale: string): BlogPostMeta[] {
  const dir = join(BLOG_DIR, locale);
  if (!existsSync(dir)) return [];

  const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
  const posts: BlogPostMeta[] = [];

  for (const file of files) {
    const slug = file.replace(/\.md$/, "");
    const content = readFileSync(join(dir, file), "utf-8");
    const meta = parseFrontmatter(content, slug);
    if (meta) posts.push(meta);
  }

  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

// Mots significatifs des keywords d'un article (« alternative meetup gratuite »
// → alternative, meetup, gratuite). Les keywords complets se recoupent rarement
// d'un article à l'autre, leurs mots si.
function keywordTerms(post: BlogPostMeta): Set<string> {
  return new Set(
    post.keywords
      .flatMap((keyword) => keyword.toLowerCase().split(/\s+/))
      .filter((term) => term.length >= 4),
  );
}

// Articles liés, pour le maillage interne : les plus proches par mots-clés
// partagés (les plus récents à score égal : getAllPosts est déjà trié et le tri
// de JS est stable), plus l'article suivant dans l'ordre chronologique, en
// boucle. Ce dernier garantit que chaque article est lié depuis au moins un
// autre, même celui qui ne partage aucun mot-clé.
export function getRelatedPosts(
  slug: string,
  locale: string,
  limit = 3,
): BlogPostMeta[] {
  const posts = getAllPosts(locale);
  const index = posts.findIndex((post) => post.slug === slug);
  if (index === -1 || posts.length < 2) return [];

  const current = posts[index];
  const next = posts[(index + 1) % posts.length];
  const currentTerms = keywordTerms(current);
  const score = (post: BlogPostMeta) =>
    [...keywordTerms(post)].filter((term) => currentTerms.has(term)).length;

  const closest = posts
    .filter((post) => post !== current && post !== next)
    .map((post) => ({ post, score: score(post) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit - 1)
    .map(({ post }) => post);

  return [...closest, next];
}

export async function getPostBySlug(
  slug: string,
  locale: string,
): Promise<BlogPost | null> {
  const filePath = join(BLOG_DIR, locale, `${slug}.md`);
  if (!existsSync(filePath)) return null;

  const fileContent = readFileSync(filePath, "utf-8");
  const meta = parseFrontmatter(fileContent, slug);
  if (!meta) return null;

  const { content: rawMarkdown } = matter(fileContent);
  const content = await compileMarkdown(rawMarkdown);

  return { ...meta, content };
}

export function estimateReadingTime(content: string): number {
  const words = content.replace(/<[^>]*>/g, "").split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export function formatBlogDate(dateStr: string, locale: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(
    locale === "fr" ? "fr-FR" : "en-US",
    { day: "numeric", month: "long", year: "numeric" },
  );
}

export function getPostSlugs(locale: string): string[] {
  const dir = join(BLOG_DIR, locale);
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}
