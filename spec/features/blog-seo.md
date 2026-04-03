# Blog SEO — Spec détaillée

> **Objectif** : créer un blog statique bilingue (FR/EN) pour acquérir du trafic organique
> sur les requêtes SEO identifiées dans `spec/infra/seo-strategy.md` (Phase 3.1).
>
> **Positionnement** : le blog est un **satellite d'acquisition**, pas une feature produit.
> Il vit pour Google, pas pour les utilisateurs connectés. Chaque article est une landing page
> autonome qui pousse vers le produit.

---

## Architecture technique

### Approche : Markdown fichiers locaux

Les articles sont des fichiers `.md` versionnés dans le repo, avec frontmatter YAML.
Rendu statique via `unified` (`remark` + `rehype`) + `gray-matter`. Zéro infrastructure externe.

**Justification** :
- Proportionné au besoin (5-15 articles SEO, un seul rédacteur)
- Versionné avec git (review, historique, rollback)
- Build statique → performance maximale
- Cohérent avec l'existant (changelog, pages legal = fichiers)
- Zéro dépendance externe (pas de CMS, pas d'API tierce)

**Pourquoi Markdown et pas MDX** :
Les articles SEO n'ont pas besoin de composants React interactifs. Du Markdown standard
suffit (titres, paragraphes, listes, liens, images, tableaux, gras/italique).
L'écosystème `remark`/`rehype` est stable, sans risque de compatibilité avec Next.js 16 / React 19
(contrairement à `next-mdx-remote` qui n'est pas battle-tested sur cette stack).
Si un jour on a besoin de composants React dans les articles, on migrera vers MDX.

### Dépendances à ajouter

| Package | Rôle |
| --- | --- |
| `gray-matter` | Parsing du frontmatter YAML |
| `unified` | Pipeline de transformation Markdown → HTML |
| `remark-parse` | Parser Markdown (entrée du pipeline) |
| `remark-gfm` | Support GitHub Flavored Markdown (tableaux, strikethrough, etc.) |
| `rehype-stringify` | Sérialisation HTML (sortie du pipeline) |
| `remark-rehype` | Pont remark → rehype (Markdown AST → HTML AST) |

> Note : `@tailwindcss/typography` (classes `prose`) est déjà installé.
> Aucune dépendance React ou Next.js spécifique n'est nécessaire.

---

## Structure des fichiers

```
src/
  content/
    blog/
      fr/
        meetup-vs-luma-vs-the-playground.md
        organiser-meetup-gratuit.md
        creer-communaute-en-ligne.md
        evenements-ne-suffisent-pas.md
        alternative-meetup-gratuite.md
      en/
        meetup-vs-luma-vs-the-playground.md
        organiser-meetup-gratuit.md
        creer-communaute-en-ligne.md
        evenements-ne-suffisent-pas.md
        alternative-meetup-gratuite.md

  app/[locale]/(routes)/blog/
    layout.tsx                → Layout blog (SiteHeader + SiteFooter, pas de sidebar)
    page.tsx                  → Liste des articles (/blog)
    [slug]/
      page.tsx                → Article individuel (/blog/[slug])
      opengraph-image.tsx     → OG image dynamique par article
  lib/
    blog.ts                   → Utilitaire : lecture, parsing, listing des articles
```

> **Pourquoi ****`src/content/`** : les fichiers dans `src/` sont automatiquement tracés par Next.js
> et inclus dans le bundle Vercel. Un dossier `content/` à la racine ne serait pas garanti
> d'être inclus sans configuration `outputFileTracingIncludes` explicite.

> **Noms de fichiers identiques FR/EN** : le nom de fichier sert de slug.
> Un même slug dans `fr/` et `en/` crée automatiquement le lien hreflang.
> Pas besoin de champ `slug` dans le frontmatter.

### Frontmatter des articles

```yaml
---
title: "Meetup vs Luma vs The Playground — comparatif 2026"
description: "Comparatif détaillé des plateformes communautaires : fonctionnalités, prix, UX. Quelle alternative gratuite à Meetup et Luma ?"
date: "2026-04-15"
keywords:
  - alternative meetup
  - alternative luma
  - plateforme communauté gratuite
  - comparatif meetup luma
author: "The Playground"
---
```

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `title` | string | oui | Titre de l'article (H1 + meta title) |
| `description` | string | oui | Meta description (SEO) |
| `date` | string (YYYY-MM-DD) | oui | Date de publication |
| `keywords` | string[] | oui | Mots-clés cibles (utilisés dans les meta tags) |
| `author` | string | non | Auteur (défaut : "The Playground") |

> **Champs retirés** :
> - `slug` — dérivé du nom de fichier (sans extension). Évite la désynchronisation.
> - `locale` — dérivée du dossier parent (`fr/` ou `en/`). Évite la redondance.

> **Règle hreflang** : un article FR `src/content/blog/fr/mon-article.md`
> est lié à son équivalent EN `src/content/blog/en/mon-article.md` par le nom de fichier identique.

---

## Utilitaire `src/lib/blog.ts`

Fonctions pures de lecture et parsing des articles. Même pattern que `parse-changelog.ts`.

```typescript
// Types
type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string;          // YYYY-MM-DD
  keywords: string[];
  author: string;
  content: string;       // HTML compilé depuis le Markdown
};

type BlogPostMeta = Omit<BlogPost, "content">;

// Fonctions
getAllPosts(locale: string): BlogPostMeta[]
// Liste tous les articles d'une locale, triés par date décroissante.
// Lit les fichiers dans src/content/blog/{locale}/*.md, parse le frontmatter.
// Le slug est dérivé du nom de fichier (sans extension .md).

getPostBySlug(slug: string, locale: string): BlogPost | null
// Retourne un article complet (meta + HTML compilé) par slug et locale.
// Lit src/content/blog/{locale}/{slug}.md, parse le frontmatter,
// compile le Markdown en HTML via unified (remark-parse → remark-gfm → remark-rehype → rehype-stringify).
// Retourne null si le fichier n'existe pas.

getPostSlugs(locale: string): string[]
// Retourne tous les slugs disponibles pour une locale.
// Utilisé par generateStaticParams().
```

---

## Pages

### `/blog` — Liste des articles

**Route** : `src/app/[locale]/(routes)/blog/page.tsx`

**Comportement** :
- Affiche la liste des articles de la locale courante, triés par date décroissante
- Chaque article : titre (lien), date formatée, description (1-2 lignes)
- Design sobre, type index — pas de grille cards, juste une liste lisible
- `generateStaticParams` pour les deux locales

**Metadata** :
- Titre i18n : "Blog — The Playground" (template suffix via layout)
- Description i18n ciblée SEO
- Canonical + hreflang (`/blog` ↔ `/en/blog`)

**Design** :
```
[SiteHeader]

<main class="mx-auto max-w-2xl px-4 py-12">
  <h1>Blog</h1>
  <p class="text-muted-foreground">Guides, comparatifs et ressources...</p>

  <article>                          ← répété pour chaque article
    <time>15 avril 2026</time>
    <h2><a href="/blog/slug">Titre de l'article</a></h2>
    <p>Description courte...</p>
  </article>
</main>

[SiteFooter]
```

### `/blog/[slug]` — Article individuel

**Route** : `src/app/[locale]/(routes)/blog/[slug]/page.tsx`

**Comportement** :
- Lit l'article via `getPostBySlug(slug, locale)`
- Le contenu est déjà en HTML (compilé par `unified` dans `blog.ts`)
- Rend le HTML dans un conteneur `prose` via `dangerouslySetInnerHTML`
- 404 si le slug n'existe pas pour la locale
- `generateStaticParams` : retourne tous les slugs × locales

> **Sécurité ****`dangerouslySetInnerHTML`** : acceptable ici car le HTML provient de fichiers Markdown
> versionnés dans le repo (contenu de confiance, pas d'input utilisateur).

**Metadata** :
- Titre : `post.title` (suffixé par le template)
- Description : `post.description`
- Keywords : `post.keywords`
- Canonical + hreflang (même slug, deux locales)
- OpenGraph : titre, description, type `"article"`, `publishedTime`

**Design** :
```
[SiteHeader]

<main class="mx-auto max-w-2xl px-4 py-12">
  <nav>
    <a href="/blog">← Blog</a>       ← lien retour
  </nav>

  <header>
    <time>15 avril 2026</time>
    <h1>Titre de l'article</h1>
  </header>

  <article class="prose dark:prose-invert max-w-none">
    {contenu HTML}
  </article>

  <aside>                             ← CTA final
    <h3>Lancez votre communauté gratuitement</h3>
    <p>The Playground est 100% gratuit, sans commission.</p>
    <a href="/">Commencer →</a>       ← Button variant="default" size="lg"
  </aside>
</main>

[SiteFooter]
```

### Layout blog

**Route** : `src/app/[locale]/(routes)/blog/layout.tsx`

Identique au layout `(static)` existant :

```tsx
export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
```

> Note : le blog a son propre layout (et pas dans le group `(static)`) pour permettre
> une évolution indépendante (sidebar, navigation inter-articles, etc.).

---

## SEO

### JSON-LD `BlogPosting` par article

Chaque page `/blog/[slug]` injecte un schema JSON-LD `BlogPosting` :

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "Titre de l'article",
  "description": "Description...",
  "datePublished": "2026-04-15",
  "author": {
    "@type": "Organization",
    "name": "The Playground",
    "url": "https://the-playground.fr"
  },
  "publisher": {
    "@type": "Organization",
    "name": "The Playground",
    "url": "https://the-playground.fr",
    "logo": {
      "@type": "ImageObject",
      "url": "https://the-playground.fr/brand/logo-dark.png"
    }
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://the-playground.fr/blog/slug"
  },
  "inLanguage": "fr",
  "keywords": "alternative meetup, plateforme communauté gratuite"
}
```

### OG image dynamique

Fichier `opengraph-image.tsx` dans `/blog/[slug]/`, même pattern que les pages événement :
- 1200×630 px
- Fond sombre avec gradient
- Titre de l'article (tronqué à ~80 caractères)
- Date de publication
- Logo The Playground en bas à droite
- Mention "Blog" en haut à gauche
- Polices Inter (Regular + Bold) depuis `src/assets/fonts/`

### Sitemap

Ajouter les articles dans `src/app/sitemap.ts` :

```typescript
// Blog posts
const frPosts = getAllPosts("fr");
const blogEntries = frPosts.map((post) =>
  withAlternates(baseUrl, `blog/${post.slug}`, {
    lastModified: new Date(post.date),
    changeFrequency: "monthly",
    priority: 0.6,
  })
);
```

Plus une entrée statique pour `/blog` (priorité 0.5, changeFrequency weekly).

### Canonical + hreflang

Chaque article a :
- `canonical` : `https://the-playground.fr/blog/{slug}` (FR) ou `https://the-playground.fr/en/blog/{slug}` (EN)
- `alternates.languages` : `{ fr: .../blog/{slug}, en: .../en/blog/{slug} }`

Le slug identique entre les deux langues (dérivé du nom de fichier) garantit la liaison hreflang.

---

## Intégration dans l'app

### Footer uniquement

Ajout d'un lien "Blog" dans le `SiteFooter`, entre "Aide" et "Contact" :

```tsx
<Link href="/blog" className="hover:text-foreground transition-colors">
  {t("product.blog")}
</Link>
```

> Le blog **n'apparaît pas** dans le header (`SiteHeader`). C'est un satellite d'acquisition,
> pas une feature produit.

### i18n

Nouvelles clés dans `messages/fr.json` et `messages/en.json` :

```jsonc
// Namespace "Blog"
{
  "Blog": {
    "pageTitle": "Blog",
    "pageDescription": "Guides, comparatifs et ressources pour créer et animer votre communauté.",  // FR
    "backToList": "← Retour au blog",
    "publishedOn": "Publié le {date}",
    "ctaTitle": "Lancez votre communauté gratuitement",
    "ctaDescription": "The Playground est la plateforme 100% gratuite pour créer votre communauté et organiser des événements.",
    "ctaButton": "Commencer",
    "noPosts": "Aucun article pour le moment."
  }
}

// Namespace "Footer" — ajout
{
  "Footer": {
    "product.blog": "Blog"  // FR et EN identiques
  }
}
```

---

## CTA de conversion

Chaque article inclut un **bloc CTA en fin d'article** (pas dans le Markdown, injecté par le template page) :

- Fond `bg-muted/60`, bordure arrondie, padding généreux
- Titre : "Lancez votre communauté gratuitement" (i18n)
- Sous-titre : "The Playground est la plateforme 100% gratuite..." (i18n)
- Bouton : `variant="default" size="lg"` → lien vers `/`
- Ce CTA est **identique sur tous les articles** — pas de customisation par article

---

## Articles prévus (Phase 3.1)

Ordre de priorité basé sur le volume de recherche estimé et l'alignement produit :

| # | Slug (= nom de fichier) | Titre FR | Requêtes ciblées |
| --- | --- | --- | --- |
| 1 | `meetup-vs-luma-vs-the-playground` | Meetup vs Luma vs The Playground — comparatif 2026 | alternative meetup, alternative luma, comparatif |
| 2 | `organiser-meetup-gratuit` | Comment organiser un meetup gratuit en 2026 | organiser meetup gratuit, créer meetup |
| 3 | `creer-communaute-en-ligne` | 5 étapes pour créer une communauté en ligne qui dure | créer communauté en ligne, community building |
| 4 | `evenements-ne-suffisent-pas` | Pourquoi les événements seuls ne suffisent pas | plateforme événementielle, rétention communauté |
| 5 | `alternative-meetup-gratuite` | Les meilleures alternatives gratuites à Meetup en 2026 | alternative meetup gratuite, meetup gratuit |

Chaque article : ~800-1200 mots, bilingue FR/EN, mentions naturelles du produit, CTA final.

---

## Plan d'implémentation

| Étape | Description | Effort estimé |
| --- | --- | --- |
| 1 | Installer `gray-matter` + `unified` + `remark-parse` + `remark-gfm` + `remark-rehype` + `rehype-stringify` | 5 min |
| 2 | Créer `src/lib/blog.ts` (utilitaire lecture/parsing/compilation) | 30 min |
| 3 | Créer le layout blog + page liste `/blog` | 45 min |
| 4 | Créer la page article `/blog/[slug]` avec rendu HTML + CTA | 45 min |
| 5 | Ajouter JSON-LD `BlogPosting` | 15 min |
| 6 | Créer `opengraph-image.tsx` pour les articles | 30 min |
| 7 | Intégrer dans le sitemap | 15 min |
| 8 | Ajouter le lien footer + clés i18n | 10 min |
| 9 | Écrire le premier article (comparatif) en FR + EN | 1-2h (contenu) |
| **Total infrastructure** | Étapes 1-8 | **\~3h** |

---

## Hors scope

- **Pas de catégories/tags** — inutile pour 5-10 articles, ajouterait de la complexité sans valeur SEO
- **Pas de recherche** — le volume d'articles ne le justifie pas
- **Pas de pagination** — une seule page liste suffit
- **Pas de commentaires** — le blog n'est pas un espace communautaire
- **Pas de RSS** — ajout trivial plus tard si besoin
- **Pas de composants React dans les articles** — Markdown standard suffit pour du contenu SEO. Si besoin futur, migration vers MDX possible sans casser les articles existants (`.md` est un sous-ensemble de `.mdx`)
