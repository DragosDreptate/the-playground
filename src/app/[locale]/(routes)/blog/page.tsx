import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getAppUrl } from "@/lib/app-url";
import { getAllPosts, formatBlogDate } from "@/lib/blog";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Blog");
  const appUrl = getAppUrl();
  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
    alternates: {
      canonical: `${appUrl}/blog`,
      languages: {
        fr: `${appUrl}/blog`,
        en: `${appUrl}/en/blog`,
      },
    },
    openGraph: {
      title: t("pageTitle"),
      description: t("pageDescription"),
    },
  };
}

export default async function BlogPage() {
  const locale = await getLocale();
  const t = await getTranslations("Blog");
  const posts = getAllPosts(locale);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-4xl font-extrabold tracking-tight">{t("pageTitle")}</h1>
      <p className="mt-2 text-lg text-muted-foreground">
        {t("pageDescription")}
      </p>

      {posts.length === 0 ? (
        <p className="mt-12 text-muted-foreground">{t("noPosts")}</p>
      ) : (
        <div className="mt-12 space-y-10">
          {posts.map((post) => (
            <article key={post.slug}>
              <time className="text-sm font-medium text-muted-foreground">
                {formatBlogDate(post.date, locale)}
              </time>
              <h2 className="mt-1 text-xl font-bold tracking-tight">
                <Link
                  href={`/blog/${post.slug}`}
                  className="hover:text-primary transition-colors"
                >
                  {post.title}
                </Link>
              </h2>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">
                {post.description}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
