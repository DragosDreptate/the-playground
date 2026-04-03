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
