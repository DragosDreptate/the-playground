import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ChevronLeft, Calendar, Clock } from "lucide-react";
import { getAppUrl } from "@/lib/app-url";
import {
  getPostBySlug,
  getPostSlugs,
  getRelatedPosts,
  formatBlogDate,
  estimateReadingTime,
} from "@/lib/blog";
import { buildAlternates } from "@/lib/seo";
import { Button } from "@/components/ui/button";

export async function generateStaticParams() {
  const locales = ["fr", "en"];
  const params: { slug: string; locale: string }[] = [];
  for (const locale of locales) {
    for (const slug of getPostSlugs(locale)) {
      params.push({ slug, locale });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  const post = await getPostBySlug(slug, locale);
  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    alternates: buildAlternates(locale, `/blog/${slug}`),
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = await getTranslations("Blog");
  const post = await getPostBySlug(slug, locale);
  if (!post) notFound();

  const relatedPosts = getRelatedPosts(slug, locale);
  const appUrl = getAppUrl();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: {
      "@type": "Organization",
      name: "The Playground",
      url: appUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "The Playground",
      url: appUrl,
      logo: {
        "@type": "ImageObject",
        url: `${appUrl}/brand/logo-dark.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${appUrl}/blog/${slug}`,
    },
    inLanguage: locale,
    keywords: post.keywords.join(", "),
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Back link */}
      <Link
        href="/blog"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {t("backToList")}
      </Link>

      {/* Article header */}
      <header className="mt-8 mb-10 border-b border-border pb-8">
        <time className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <Calendar className="size-3.5" />
          {t("publishedOn", { date: formatBlogDate(post.date, locale) })}
        </time>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight leading-tight">
          {post.title}
        </h1>
        <span className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="size-3.5" />
          {t("readingTime", { minutes: estimateReadingTime(post.content) })}
        </span>
        {post.keywords.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {post.keywords.slice(0, 4).map((keyword) => (
              <span
                key={keyword}
                className="rounded-full border border-border bg-muted/50 px-3 py-0.5 text-xs font-medium text-muted-foreground"
              >
                {keyword}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Article content */}
      <article
        className="prose dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      {/* Related posts : maillage interne, pour que chaque article soit lié
          depuis les autres et pas seulement depuis l'index du blog */}
      {relatedPosts.length > 0 && (
        <nav aria-labelledby="related-posts" className="mt-12 border-t border-border pt-8">
          <h2 id="related-posts" className="text-lg font-bold tracking-tight">
            {t("relatedTitle")}
          </h2>
          <div className="mt-4 space-y-3">
            {relatedPosts.map((related) => (
              <Link
                key={related.slug}
                href={`/blog/${related.slug}`}
                className="group block rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40"
              >
                <h3 className="font-semibold tracking-tight group-hover:text-primary dark:group-hover:text-[oklch(0.76_0.27_341)] transition-colors">
                  {related.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {related.description}
                </p>
              </Link>
            ))}
          </div>
        </nav>
      )}

      {/* CTA block */}
      <aside className="mt-12 rounded-xl bg-muted/60 p-8 text-center">
        <h3 className="text-xl font-bold">{t("ctaTitle")}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {t("ctaDescription")}
        </p>
        <Button asChild size="lg" className="mt-5 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 text-white hover:opacity-90">
          <Link href="/">{t("ctaButton")}</Link>
        </Button>
      </aside>
    </div>
  );
}
