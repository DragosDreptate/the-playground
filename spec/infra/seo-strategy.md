# SEO — Stratégie de référencement naturel

> **Objectif** : remonter dans les résultats Google pour les requêtes clés liées au positionnement produit.
>
> **Constat initial** (2026-04-03) : le site est indexé (sitemap OK, robots.txt OK, pages dans l'index Google)
> mais n'apparaît jamais pour des requêtes comme *"plateforme communauté événement gratuite"*,
> *"alternative meetup"*, *"alternative luma gratuite"*.
>
> **Cause racine** : très peu de contenu textuel riche ciblant les mots-clés, bugs techniques
> qui diluent l'autorité, et aucune stratégie de contenu pour construire l'autorité topique.

---

## Requêtes cibles

| Priorité | Requête | Intent |
| --- | --- | --- |
| P0 | plateforme communauté événement gratuite | Recherche de solution |
| P0 | alternative meetup gratuite | Comparaison |
| P0 | alternative luma | Comparaison |
| P1 | créer une communauté en ligne gratuitement | How-to |
| P1 | organiser un événement gratuit | How-to |
| P1 | plateforme événementielle gratuite | Recherche de solution |
| P2 | outil gestion communauté | Catégorie produit |
| P2 | meetup gratuit sans commission | Comparaison spécifique |
| P2 | community platform free | EN — Recherche de solution |

---

## Audit technique — État initial

### Ce qui fonctionne

- Sitemap dynamique avec hreflang FR/EN sur chaque URL
- robots.txt propre (allow pages publiques, disallow dashboard/admin/api)
- JSON-LD Event complet sur les pages événement (startDate, location, offers, organizer, capacity)
- JSON-LD Organization sur les pages Communauté publiques
- OG images dynamiques (1200x630) générées côté serveur pour événements et communautés
- Canonical + hreflang sur les pages événement, communauté, explorer, changelog
- ISR configuré (30s événements, 60s communautés, 300s explorer)
- Middleware : validation des slugs + blocage des bots agressifs à l'Edge

### Bugs identifiés

| # | Bug | Sévérité | Fichier | Statut |
| --- | --- | --- | --- | --- |
| T1 | Homepage : titre hardcodé en FR même sur `/en` | Haute | `src/app/[locale]/page.tsx:30` | **Fait** |
| T2 | Homepage : pas de canonical ni hreflang | Haute | `src/app/[locale]/page.tsx:26-50` | **Fait** |
| T3 | Homepage : pas d'`og:url` | Moyenne | `src/app/[locale]/page.tsx:32` | **Fait** |
| T4 | JSON-LD WebSite en doublon (layout + homepage) | Moyenne | `layout.tsx` + `page.tsx:76-89` | **Fait** |
| T5 | Sitemap : événements et communautés demo/test indexés (~35 événements + ~6 communautés) | Haute | `src/app/sitemap.ts` | **Fait** |
| T6 | Page About : titre doublonné (`"À propos · The Playground — The Playground"`) | Basse | `messages/fr.json:1596` | **Fait** |
| T7 | Pages statiques sans canonical ni hreflang (about, help, contact, legal) | Moyenne | Chaque `page.tsx` statique | **Fait** |
| T8 | Homepage OG image : l'override portrait 1241x1453 dans `generateMetadata()` écrase le générateur `opengraph-image.tsx` 1200x630 — ce dernier est du code mort | Moyenne | `page.tsx:37-42` | **Fait** |
| T9 | Homepage `force-dynamic` — empêche le cache Google efficace | Basse | `page.tsx:24` | À faire — nécessite refactoring de la logique de redirect |

---

## Phase 1 — Corrections techniques (quick wins)

> **Objectif** : corriger les bugs qui empêchent Google d'indexer correctement le site.
> **Effort** : ~2-3h. **Impact** : immédiat sur l'indexation, indirect sur le ranking.

### 1.1 Homepage : titre i18n + canonical + hreflang + og:url

**Problème** : le titre `"The Playground — Lancez votre communauté, organisez vos événements"` est hardcodé en français dans `generateMetadata()`. Sur `/en`, Google voit un titre FR sur une page EN. De plus, aucune canonical ni hreflang → Google peut traiter `/` et `/en` comme du contenu dupliqué.

**Solution** :
- Utiliser `t()` pour le titre
- Ajouter `alternates.canonical` + `alternates.languages` (comme les autres pages)
- Ajouter `openGraph.url`

**Décision** : —
**Statut** : **Fait**

### 1.2 JSON-LD WebSite : supprimer le doublon

**Problème** : le layout injecte un bloc JSON-LD `WebSite`, et la homepage en injecte un deuxième. Google voit deux schemas WebSite sur la même page.

**Solution** : supprimer le bloc JSON-LD de la homepage (`page.tsx:76-89`), garder celui du layout.

**Décision** : —
**Statut** : **Fait**

### 1.3 Sitemap : exclure les données demo/test

**Problème** : ~35 événements (slugs `demo-*`, `test-*`) et ~6 communautés demo sont dans le sitemap. Google indexe du contenu de test → dilue l'autorité du domaine et donne une mauvaise image.

**Solution** : filtrer dans `sitemap.ts` les slugs contenant `demo-` ou `test-`, ou mieux, filtrer par email du créateur (`@test.playground`, `@demo.playground`).

**Décision** : filtrer par domaine email du créateur (plus robuste que le slug)
**Statut** : **Fait**

### 1.4 Page About : fixer le titre doublonné

**Problème** : la clé i18n est `"À propos · The Playground"`, et le template layout ajoute `— The Playground` → résultat : `"À propos · The Playground — The Playground"`.

**Solution** : changer la clé en `"À propos"` (le suffixe est ajouté par le template).

**Décision** : —
**Statut** : **Fait**

### 1.5 Pages statiques : ajouter canonical + hreflang

**Problème** : les pages about, help, contact, et les 3 pages legal n'ont ni canonical ni hreflang.

**Solution** : ajouter `alternates.canonical` + `alternates.languages` sur chaque page, comme pour explorer et changelog.

**Décision** : —
**Statut** : **Fait**

### 1.6 Homepage OG image : supprimer l'override portrait

**Problème** : le `generateMetadata()` de la homepage déclare explicitement `openGraph.images` → `/hero-phone.png` (1241x1453) ET `twitter.images` → `/hero-phone.png`. Cette déclaration explicite **écrase** le générateur automatique `opengraph-image.tsx` (1200x630). Résultat : le générateur est du code mort, et toutes les plateformes reçoivent uniquement l'image portrait.

Il n'est pas possible de servir des images différentes selon la plateforme via les meta tags OG — un seul `og:image` est lu par WhatsApp, LinkedIn, Google, Facebook. La seule distinction possible est `og:image` vs `twitter:image`.

**Solution** : supprimer les `images` dans `openGraph` et `twitter` du `generateMetadata()` de la homepage. Le générateur `opengraph-image.tsx` reprend le contrôle et sert une image 1200x630 qui fonctionne correctement sur toutes les plateformes :
- LinkedIn, Facebook, Twitter : format large attendu → affichage parfait
- WhatsApp : crop au centre en carré → acceptable (texte à gauche, téléphone à droite)
- Google : miniature → acceptable

**Décision** : —
**Statut** : **Fait**

---

## Phase 2 — Enrichissement du contenu (impact fort)

> **Objectif** : donner à Google du contenu textuel riche qui cible les requêtes.
> **Effort** : ~4-6h. **Impact** : fort sur le ranking à moyen terme (2-6 semaines).

### 2.1 Meta descriptions enrichies

**Problème** : la meta description de la homepage est `"La plateforme gratuite pour créer votre communauté et organiser des événements mémorables."` — correcte mais trop générique. Aucune mention des mots-clés de comparaison.

**Solution** : enrichir les descriptions avec les termes de recherche, sans keyword stuffing.

**Exemples** :
- **Homepage FR** : `"The Playground — la plateforme gratuite pour créer votre communauté et organiser des événements. Alternative à Meetup et Luma, sans commission ni abonnement."`
- **Homepage EN** : `"The Playground — the free platform to build your community and host events. A free alternative to Meetup and Luma, with no fees or subscriptions."`
- **Explorer FR** : `"Découvrez des communautés et événements près de chez vous. Rejoignez gratuitement sur The Playground, la plateforme communautaire 100% gratuite."`

**Décision** : séparer `heroSubtitle` (texte visible) et `metaDescription` (meta tag enrichi) pour ne pas polluer le UI avec du texte SEO
**Statut** : **Fait**

### 2.2 Section comparaison sur la homepage

**Problème** : aucune page du site ne mentionne Meetup, Luma, ou ne se positionne comme alternative. Google ne peut pas associer le site à ces requêtes de comparaison.

**Solution** : ajouter une section sur la homepage (entre les piliers et le CTA final) avec un tableau comparatif textuel : "Pourquoi The Playground ?". ~200-300 mots de contenu riche en mots-clés.

**Contenu proposé** :
- Tableau : The Playground vs Meetup vs Luma vs Eventbrite
- Axes : communauté persistante, gratuit, UX premium, ownership des données, inscription sans friction
- Texte d'introduction naturel avec les mots-clés cibles

**Décision** : composant `ComparisonSection` dans `components/landing/`, intégré entre les 3 piliers et le CTA final. Fond `bg-muted/60` alternant avec la section précédente (piliers sur fond blanc).
**Statut** : **Fait**

### 2.3 FAQ avec JSON-LD FAQPage

**Problème** : aucune FAQ sur le site. Les FAQ structurées (JSON-LD `FAQPage`) sont affichées en rich snippet par Google → visibilité accrue dans les SERP.

**Solution** : ajouter une section FAQ sur la homepage (ou page dédiée `/faq`) avec 6-8 questions ciblant les requêtes.

**Questions proposées** :
1. "The Playground est-il vraiment gratuit ?"
2. "Quelle est la différence avec Meetup ?"
3. "Quelle est la différence avec Luma ?"
4. "Comment créer une communauté ?"
5. "Puis-je organiser des événements payants ?"
6. "Mes données sont-elles exportables ?"
7. "The Playground fonctionne-t-il en France et à l'international ?"

Chaque réponse = 2-3 phrases avec les mots-clés naturels + JSON-LD `FAQPage` pour les rich snippets.

**Décision** : —
**Statut** : À faire

### 2.4 Section "Pour qui" sur la homepage

**Problème** : le site ne dit pas explicitement à qui il s'adresse. Google a besoin de contexte sémantique pour associer le site aux requêtes des personas cibles.

**Solution** : section "Pour qui est The Playground ?" listant les profils :
- Organisateurs de meetups tech
- Communautés sportives et associatives
- Clubs et réseaux professionnels
- Communautés de quartier
- Organisateurs d'ateliers et formations

~150 mots de texte riche.

**Décision** : —
**Statut** : À faire

---

## Phase 3 — Autorité et contenu long terme

> **Objectif** : construire l'autorité topique du domaine via du contenu et des backlinks.
> **Effort** : continu. **Impact** : fort à long terme (1-3 mois).

### 3.1 Blog (`/blog`)

**Problème** : aucun contenu éditorial. Le site n'a que des pages produit. Impossible de ranker sur les longues traînes informatives ("comment organiser un meetup", "créer une communauté en ligne").

**Solution** : créer un blog avec des articles ciblant les requêtes longue traîne.

**Articles proposés** (priorité) :
1. "Comment organiser un meetup gratuit en 2026 — guide complet"
2. "Meetup vs Luma vs The Playground — comparatif détaillé"
3. "5 étapes pour créer une communauté en ligne qui dure"
4. "Pourquoi les événements seuls ne suffisent pas — le modèle communautaire"
5. "Organiser des événements sans budget : les outils gratuits"

**Décision** : reporté post-Phase 2 — nécessite une infrastructure blog (MDX ou CMS)
**Statut** : Backlog

### 3.2 Backlinks

**Sources identifiées** :
- GitHub (repo public — déjà en place)
- Product Hunt (lancement)
- LinkedIn (articles, posts — en cours via spec/mkt)
- Annuaires SaaS francophones (Capterra FR, AppSumo alternatives, etc.)
- Partenariats communautés existantes (The Spark, communautés utilisatrices)

**Décision** : hors scope technique — action marketing
**Statut** : Backlog

### 3.3 Google Search Console

**Actions** :
- Vérifier que le site est bien vérifié dans GSC
- Soumettre le sitemap
- Surveiller les requêtes pour lesquelles le site apparaît (même en position basse)
- Identifier les pages indexées vs non indexées
- Surveiller les erreurs de crawl

**Décision** : —
**Statut** : À vérifier

---

## Décisions prises

| Date | Décision |
| --- | --- |
| 2026-04-03 | Création de la spec SEO — audit initial, 3 phases identifiées |
| 2026-04-03 | Filtrage sitemap par email créateur (`@test.playground`, `@demo.playground`) plutôt que par slug |

---

## Journal de bord

| Date | Action | Résultat |
| --- | --- | --- |
| 2026-04-03 | Audit SEO complet (code + site live) | 9 bugs techniques, 3 manques de contenu identifiés |
| 2026-04-03 | Phase 1 implémentée (T1-T8) | Titre i18n, canonical/hreflang sur toutes les pages, JSON-LD dédoublonné, sitemap filtré, About title fixé, OG image corrigée |
