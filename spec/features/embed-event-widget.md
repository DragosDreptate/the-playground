# Spec — Widget embeddable par événement

Issue : [#485](https://github.com/DragosDreptate/the-playground/issues/485)

## Contexte et motivation

Un Organisateur a un site externe (blog, page d'association, landing page Notion/Webflow, etc.) et veut y promouvoir un événement précis de The Playground. Il veut un snippet à copier-coller, qui se met à jour automatiquement (date, places restantes, état) et qui ramène les visiteurs vers la page publique de l'événement pour s'inscrire.

**Principe directeur** : une iframe = un événement. L'Organisateur insère un snippet par événement à promouvoir et le retire à la main quand il ne veut plus l'afficher. Pas de logique de cycle de vie automatique côté plateforme.

**Différenciation marchande** : Luma et Meetup paywallent leurs intégrations (API derrière Plus / Pro). The Playground reste 100% gratuit, le widget est inclus.

---

## Décisions de design

| # | Décision |
|---|---|
| D1 | Une iframe affiche **un seul événement** (pas une liste, pas un calendrier de Communauté). |
| D2 | Aucun script JS injecté chez l'hôte. Pure iframe pour isolation totale (CSS, sécurité). |
| D3 | URL de l'iframe : `/embed/m/[slug]` (réutilise le slug d'événement déjà public). |
| D4 | Locale via query param : `?locale=fr` ou `?locale=en`. Défaut FR si absent ou valeur invalide. L'Organisateur choisit dans la modale du dashboard. |
| D5 | Theming via query param : `?theme=light` ou `?theme=dark`. Défaut light si absent ou valeur invalide. |
| D6 | États passé / annulé : carte affichée en variant "passive" (visuel grisé, CTA remplacé par "Voir d'autres événements" vers `/circles/[slug]`). |
| D7 | États DRAFT / slug inexistant : `notFound()` Next.js (404). Cohérent avec `/m/[slug]`. |
| D8 | Social proof : avatars des premiers inscrits + nombre d'inscrits, identique à la page publique `/m/[slug]`. |
| D9 | CTA "S'inscrire" ouvre `/m/[slug]` dans une nouvelle fenêtre (`target="_blank"`, `rel="noopener"`). |
| D10 | Footer discret "Powered by The Playground" cliquable, ouvre `the-playground.fr` dans une nouvelle fenêtre. |
| D11 | Image de cover obligatoire en 1:1 (règle absolue projet). Si l'événement n'a pas de cover, fallback gradient comme partout ailleurs. |
| D12 | Cache Next.js `revalidate = 300` (5 min) pour absorber le trafic sites hôtes sans hammer la DB. |
| D13 | Pas de tracking PostHog dans l'iframe (RGPD : on est dans le contexte d'un site tiers). |
| D14 | Pas de personnalisation de design côté Organisateur (couleurs, logo). Look uniforme = brand awareness. |
| D15 | Tracking server-side via PostHog (event `embed_widget_view` avec props `momentSlug`, `locale`, `theme`, `circleSlug`). Aucun cookie, aucun identifiant visiteur — RGPD-safe. Vues exploitables en interne pour dashboards futurs. |
| D16 | Hauteur du snippet : **250px desktop** (= cover w-48 + p-4 + footer mention), à utiliser tel quel dans le `<iframe height="250">` généré. Mobile : si l'iframe est plus étroite que ~480px, la carte bascule en layout vertical et l'utilisateur doit ajuster `height` manuellement (auto-resize via `postMessage` hors scope V1). |

---

## URL et paramètres

### Format

```
/embed/m/[slug]?locale=fr&theme=light
```

### Paramètres

| Param | Valeurs | Défaut | Validation |
|---|---|---|---|
| `slug` (path) | Slug d'événement valide | (obligatoire) | `isValidSlug()` côté middleware + `findBySlug` côté page |
| `locale` (query) | `fr`, `en` | `fr` | Toute autre valeur ramène au défaut, sans erreur |
| `theme` (query) | `light`, `dark` | `light` | Toute autre valeur ramène au défaut, sans erreur |

### Pourquoi route séparée de `/[locale]/...`

L'iframe doit servir une page sans aucun chrome du site (header, footer, nav, breadcrumbs). On crée donc une **route racine `/embed/`** hors de l'arbre `[locale]/(routes)/` pour qu'elle ne reçoive pas le layout principal. La locale est gérée manuellement via le query param.

---

## États et comportements

| État de l'événement | Affichage carte | CTA principal |
|---|---|---|
| `PUBLISHED`, à venir, places disponibles | Carte normale | `S'inscrire` → `/m/[slug]` |
| `PUBLISHED`, à venir, complet (sans waitlist) | Carte normale, badge "Complet" | `Voir l'événement` → `/m/[slug]` |
| `PUBLISHED`, à venir, complet (avec waitlist) | Carte normale, badge "Complet, liste d'attente" | `Rejoindre la liste d'attente` → `/m/[slug]` |
| `PUBLISHED`, passé | Carte grisée, badge "Événement passé" | `Voir d'autres événements` → `/circles/[circleSlug]` |
| `CANCELLED` | Carte grisée, badge "Événement annulé" | `Voir d'autres événements` → `/circles/[circleSlug]` |
| `DRAFT` | — | 404 (cohérent avec `/m/[slug]`) |
| Slug inexistant | — | 404 |

---

## Design de la carte

### Contenu (toujours présent)

- **Image de cover** carrée 1:1 (~120-160px côté), à gauche ou en haut selon largeur iframe
- **Titre** de l'événement (1-2 lignes max, ellipsis)
- **Date + heure** complète et lisible
- **Lieu** : nom du lieu + "En ligne" si applicable
- **Avatars** des 4 premiers inscrits + "+N autres" si plus
- **Compteur** : "X inscrits" (ou "X / Y" si capacité)
- **CTA primaire** : bouton plein largeur en bas
- **Footer** : "Powered by The Playground" en petit, cliquable

### Variants visuels

| Variant | Quand | Style |
|---|---|---|
| `active-light` | PUBLISHED à venir, theme=light | Look standard plateforme |
| `active-dark` | PUBLISHED à venir, theme=dark | Fond sombre, texte clair, CTA accent rose plateforme |
| `passive-light` | passé/annulé, theme=light | Image et texte désaturés (filter grayscale), CTA en outline |
| `passive-dark` | passé/annulé, theme=dark | Idem version dark |

### Layout

Validé visuellement via [embed-event-widget.mockup.html](../mockups/embed-event-widget.mockup.html). Deux layouts selon largeur iframe :

- **≥ 480px (desktop)** : 2 colonnes — cover 1:1 (192×192) à gauche, contenu droite (titre + date + lieu + social proof) avec CTA aligné en bas via `mt-auto`, footer "Powered by" centré sous les 2 colonnes.
- **< 480px (mobile)** : layout vertical — cover 1:1 pleine largeur (`w-full aspect-square`), titre + date + lieu + social proof + CTA empilés dessous, footer en bas.

Wrapper carte : `p-4`, `rounded-2xl`, `border border-slate-200` (light) ou `border-slate-800` (dark). Cover : `rounded-xl`. Espacement vertical aéré (`mt-4` entre blocs).

Réutiliser au maximum le composant `MomentCard` existant si possible (à valider en début d'implémentation).

---

## Layout et headers HTTP

### Layout dépouillé

```
src/app/embed/m/[slug]/layout.tsx
```

Contient seulement `<html>`, `<body>`, `<NextIntlClientProvider>` avec la locale du query param, et les polices/styles globaux. **Pas de `SiteHeader`, pas de `SiteFooter`**.

### Headers HTTP

Pour autoriser l'embed sur n'importe quel domaine externe :

```ts
// vercel.ts
headers: [
  {
    source: "/embed/(.*)",
    headers: [
      { key: "Content-Security-Policy", value: "frame-ancestors *" },
      // Pas de X-Frame-Options (qui surchargerait CSP en plus restrictif)
    ],
  },
],
```

Vérifier qu'aucune config existante (Next.js, Vercel, middleware) ne pose `X-Frame-Options: DENY` ou `SAMEORIGIN` sur cette route en amont.

### Cache

```ts
// src/app/embed/m/[slug]/page.tsx
export const revalidate = 300; // 5 minutes
```

Une publication d'événement met au pire 5 min à apparaître dans les widgets déjà embarqués. Acceptable.

---

## Workflow Organisateur

### Sur la page dashboard détail d'un événement

Ajouter un bouton **"Intégrer sur mon site"** à côté du bouton "Copier le lien public" existant.

```
[Copier le lien public]   [Intégrer sur mon site]   [Modifier]   [Annuler]
```

### Modale "Intégrer sur mon site"

Contient :

1. **Aperçu live** de la carte (rendu réel via `<iframe>` pointant sur l'URL générée). Permet de switcher locale et theme dans l'aperçu.
2. **Sélecteur de langue** : FR / EN (bascule l'aperçu et le snippet).
3. **Sélecteur de theme** : Clair / Sombre (bascule l'aperçu et le snippet).
4. **Snippet copier-coller** dans un bloc code, avec bouton "Copier" :
   ```html
   <iframe
     src="https://the-playground.fr/embed/m/[slug]?locale=fr&theme=light"
     width="480"
     height="250"
     frameborder="0"
     title="Événement : [titre]"
     loading="lazy"
   ></iframe>
   ```
5. **Note explicative discrète** : "Le widget s'affiche automatiquement avec les infos à jour. Pensez à le retirer de votre site quand l'événement sera passé."

### Composant à créer

`src/components/moments/moment-embed-modal.tsx` ou similaire. État local pour locale + theme, snippet généré dynamiquement, bouton copier qui utilise l'API Clipboard.

---

## Découpage en jalons

| Jalon | Effort | Contenu |
|---|---|---|
| **J1 — Route et page minimale** | 0,5 j | Route `/embed/m/[slug]`, layout dépouillé, fetch via repository, rendu d'une carte basique sans theming |
| **J2 — Design carte active** | 1,5 j | Carte responsive light + dark, variants horizontaux et verticaux, social proof, CTA |
| **J3 — États passifs** | 0,5 j | Variants passé/annulé, CTA "Voir d'autres événements", 404 pour DRAFT/inexistant |
| **J4 — Locale et theme** | 0,5 j | Query params, validation, fallbacks, NextIntlClientProvider |
| **J5 — Modale dashboard** | 1 j | Composant modale, sélecteurs locale/theme, aperçu live, snippet copier-coller |
| **J6 — Headers et cache** | 0,5 j | Config CSP frame-ancestors, revalidate, vérification anti-régression sur autres routes |
| **J7 — Analytics server-side** | 0,5 j | Event PostHog `embed_widget_view` côté serveur, sans cookie |
| **J8 — Tests E2E** | 0,5 j | Render, headers, états, modale dashboard, vérification event PostHog émis |
| **Total** | **5,5 jours** | |

---

## Tests E2E à prévoir

Nouveau fichier `tests/e2e/embed-widget.spec.ts` :

1. **Rendu de base** : visiteur non auth sur `/embed/m/[slug]` → 200, contient le titre de l'événement.
2. **Headers CSP** : la réponse contient `Content-Security-Policy: frame-ancestors *`.
3. **Locale** : `?locale=en` → titres et boutons en anglais. `?locale=xx` → fallback FR.
4. **Theme** : `?theme=dark` → classe CSS dark présente sur le `<body>`.
5. **État passé** : événement passé → carte grisée + CTA "Voir d'autres événements".
6. **État annulé** : événement CANCELLED → carte annulée + CTA Communauté.
7. **DRAFT et 404** : `/embed/m/draft-event` et `/embed/m/inexistant` → 404.
8. **CTA target=_blank** : le CTA principal a `target="_blank" rel="noopener"`.
9. **Modale dashboard** : Organisateur connecté → bouton "Intégrer" présent, ouvre modale, snippet contient le bon slug et les bons params, bouton Copier fonctionne.
10. **Pas de header/footer projet** : la page `/embed/m/[slug]` ne contient pas les éléments `SiteHeader` / `SiteFooter`.

---

## Hors scope V1 (rappel)

- API JSON publique (réversible si demande remonte)
- Widget niveau Communauté (liste / calendrier)
- Personnalisation Organisateur (couleurs, logo, taille)
- Theming `auto` via `prefers-color-scheme`
- Auto-resize de l'iframe via `postMessage`
- Dashboard analytics "X embed views" exposé à l'Organisateur (les données sont collectées en V1 via PostHog, l'UI viendra plus tard)
- Webhooks vers le site externe (création/modif d'événement)
- Multi-événement dans un seul widget (calendrier complet)

---

## Questions ouvertes

| # | Question | Statut |
|---|---|---|
| Q1 | Le composant `MomentCard` existant peut-il être réutilisé tel quel pour l'embed, ou faut-il un nouveau composant `EmbedEventCard` ? | À trancher au début du J2 selon la structure réelle du composant |
| Q2 | Sur quel domaine le widget renvoie-t-il les CTAs : `the-playground.fr` (prod) ou variable d'env ? | Utiliser `NEXT_PUBLIC_APP_URL` pour cohérence avec le reste du code |
| Q3 | Faut-il loguer côté serveur les requêtes embed pour stats internes (sans tracking visiteur) ? | Non en V1, ajouter post-MVP si besoin |
