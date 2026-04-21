import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
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
      <div className="border-l-[3px] border-primary pl-5">
        <h1 className="text-4xl font-extrabold tracking-tight">
          {t("pageTitle")}
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          {t("pageDescription")}
        </p>
      </div>

      {posts.length === 0 ? (
        <p className="mt-12 text-muted-foreground">{t("noPosts")}</p>
      ) : (
        <div className="mt-10 space-y-5">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/40"
            >
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-0.5 rounded-full bg-primary" />
                <time className="text-sm font-medium text-muted-foreground">
                  {formatBlogDate(post.date, locale)}
                </time>
              </div>
              <h2 className="mt-2.5 text-lg font-bold tracking-tight group-hover:text-primary dark:group-hover:text-[oklch(0.76_0.27_341)] transition-colors">
                {post.title}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {post.description}
              </p>
              <div className="mt-3 flex items-center gap-1.5 text-sm font-medium text-muted-foreground group-hover:text-primary dark:group-hover:text-[oklch(0.76_0.27_341)] transition-colors">
                {t("readMore")}
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
