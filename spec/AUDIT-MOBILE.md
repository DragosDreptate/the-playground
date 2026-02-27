# Audit Mobile — The Playground

> Date : 2026-02-22
> Scope : toutes les pages, viewport mobile (< 768px)
> Auditeur : Claude Opus 4.6, audit statique du code source

---

## Resume executif

L'application The Playground presente une bonne base responsive grace a l'utilisation coherente de Tailwind CSS avec des breakpoints `lg:` pour les layouts 2 colonnes et des `max-w-*` raisonnables. Cependant, plusieurs problemes critiques impactent l'experience mobile : le hero de la homepage deborde horizontalement a cause de `whitespace-nowrap` sur les titres, l'admin n'a aucune adaptation mobile (sidebar fixe de 224px), les timelines du dashboard ont une colonne de dates rigide qui ecrase le contenu sur petit ecran, et la navigation header masque les liens centraux sans alternative mobile. Les formulaires sont globalement bien concus (inputs a `text-base` sur mobile, bon espacement), mais le formulaire de creation d'événement a des lignes date/heure qui debordent. Le design systeme (boutons, badges, cartes) est solide et adapte au tactile.

---

## Score global

**6.5 / 10**

**Justification** : La majorite des pages de contenu (événement, Communauté, Profil, Explorer) s'adaptent correctement grace a `flex-col` / `lg:flex-row`. Les composants partages sont bien concus. Mais les problemes P0 (overflow homepage, admin inutilisable, navigation manquante) penalisent fortement le score. L'application n'est pas "cassee" sur mobile, mais elle n'est pas encore au niveau Luma attendu par le projet.

---

## Problemes critiques (P0)

### P0-1. Homepage hero : debordement horizontal (`whitespace-nowrap`)

**Fichier** : `/Users/dragos/AI Projects/the-playground/src/app/[locale]/page.tsx`, lignes 55-72

```tsx
<span className="block whitespace-nowrap">
  <span className="bg-gradient-to-r ...">
    {t("heroHighlight1")}
  </span>{" "}
  {t("heroRest1")}
</span>
```

Les 3 lignes du hero utilisent `whitespace-nowrap`. Sur un viewport de 320-375px, les textes comme "Lancez votre Communauté." ou "Organize your Moments." debordent du viewport et creent un scroll horizontal sur toute la page.

**Impact** : Scroll horizontal parasite, premiere impression degradee, critere de qualite mobile basique non respecte.

**Solution** : Retirer `whitespace-nowrap` et laisser le texte wrapper naturellement. Eventuellement utiliser `whitespace-nowrap md:whitespace-normal` si le nowrap est souhaite uniquement sur desktop, ou mieux : retirer completement la classe puisque le texte est assez court pour tenir sur une ligne desktop sans elle.

---

### P0-2. Admin : aucune adaptation mobile (sidebar fixe 224px)

**Fichier** : `/Users/dragos/AI Projects/the-playground/src/components/admin/admin-sidebar.tsx`, ligne 29

```tsx
<aside className="flex w-56 shrink-0 flex-col border-r border-border/40 bg-muted/30">
```

**Fichier** : `/Users/dragos/AI Projects/the-playground/src/app/[locale]/(routes)/admin/layout.tsx`, ligne 17

```tsx
<div className="flex min-h-screen">
  <AdminSidebar />
  <main className="flex-1 overflow-auto">
```

La sidebar admin fait 224px (`w-56`) fixe. Sur un ecran de 375px, il reste 151px pour le contenu principal. Les tables de donnees (users, circles, moments) avec 6 colonnes sont totalement illisibles.

**Impact** : L'admin est inutilisable sur mobile. Les tables debordent, le texte est tronque, la navigation est ecrasee.

**Solution** :
- Rendre la sidebar collapsible avec un bouton hamburger sur mobile : `hidden md:flex` pour la sidebar, ajouter un drawer/sheet mobile
- OU transformer en bottom tabs / top tabs sur mobile
- Ajouter `overflow-x-auto` sur les conteneurs de tables (deja fait partiellement avec `rounded-md border` mais le `<Table>` lui-meme n'a pas de scroll horizontal)

---

### P0-3. Tables admin : pas de scroll horizontal

**Fichier** : `/Users/dragos/AI Projects/the-playground/src/app/[locale]/(routes)/admin/users/page.tsx`, lignes 40-88

```tsx
<div className="rounded-md border">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>{t("columns.name")}</TableHead>
        <TableHead>{t("columns.email")}</TableHead>
        <TableHead>{t("columns.role")}</TableHead>
        <TableHead className="text-right">{t("columns.circles")}</TableHead>
        <TableHead className="text-right">{t("columns.moments")}</TableHead>
        <TableHead>{t("columns.createdAt")}</TableHead>
      </TableRow>
    </TableHeader>
```

6 colonnes dans une table sans `overflow-x-auto` sur le conteneur. Sur mobile, cela deborde du viewport.

**Solution** : Ajouter `overflow-x-auto` sur le `div.rounded-md.border` parent de chaque `<Table>`. Meme probleme probable sur `/admin/circles/page.tsx` et `/admin/moments/page.tsx`.

---

### P0-4. Header : navigation centrale invisible sur mobile

**Fichier** : `/Users/dragos/AI Projects/the-playground/src/components/site-header.tsx`, lignes 37-56

```tsx
<nav className="flex flex-1 items-center justify-center gap-6">
  {user && (
    <>
      <Link href="/explorer" ...>
        <Compass className="size-3.5" />
        {tExplorer("navLink")}
      </Link>
      <Link href="/dashboard" ...>
        <LayoutDashboard className="size-3.5" />
        {tDashboard("title")}
      </Link>
    </>
  )}
</nav>
```

Les liens de navigation (Découvrir, Mon espace) sont dans un `flex-1 justify-center`. Sur mobile, ces liens sont visibles mais compriment l'espace. Pire : avec le logo a gauche, les toggles langue/theme et le menu utilisateur a droite, la zone centrale est tres etroite (~100-150px). Les textes des liens risquent de se superposer ou d'etre illisibles.

Il n'y a **aucun menu hamburger ni drawer mobile**. Les utilisateurs authentifies n'ont aucune alternative pour acceder a Découvrir ou Mon espace de maniere confortable sur petit ecran (ils sont accessibles via le UserMenu dropdown, mais ce n'est pas intuitif).

**Solution** :
- Masquer les liens centraux sur mobile : `hidden md:flex` sur le `<nav>`
- Ajouter un menu hamburger (Sheet/Drawer) sur mobile avec les liens
- OU integrer "Découvrir" et "Mon espace" comme items supplementaires dans le `UserMenu` dropdown (ils y sont deja partiellement : Dashboard est dans le UserMenu, mais pas Découvrir)

---

## Problemes majeurs (P1)

### P1-1. Timeline dashboard : colonne date rigide a 100px

**Fichiers** :
- `/Users/dragos/AI Projects/the-playground/src/components/moments/dashboard-moment-card.tsx`, ligne 64
- `/Users/dragos/AI Projects/the-playground/src/components/circles/moment-timeline-item.tsx`, ligne 75

```tsx
<div className="w-[100px] shrink-0 pr-4 pt-1 text-right">
```

Sur un viewport de 320px, la colonne date fixe (100px) + dot (8px) + padding carte (16px) = 124px incompressibles. La carte de contenu n'a que ~196px de largeur restante. Avec le thumbnail gradient de 60px, le contenu textuel dispose de ~120px. Les titres d'Escales sont tronques tres agressivement.

**Solution** : Reduire la colonne date sur mobile : `w-[72px] md:w-[100px]` ou passer a un layout empile (date au-dessus de la carte) sur mobile. Exemple :

```tsx
<div className="w-[72px] shrink-0 pr-3 pt-1 text-right md:w-[100px] md:pr-4">
```

---

### P1-2. Formulaire événement : lignes date/heure qui debordent

**Fichier** : `/Users/dragos/AI Projects/the-playground/src/components/moments/moment-form-date-card.tsx`, lignes 70-91

```tsx
<div className="flex items-center gap-3">
  <div className="... size-9 ...">  <!-- 36px -->
  <span className="... w-12 ...">   <!-- 48px -->
  <DatePickerButton />               <!-- variable, ~100px -->
  <TimeSelect />                     <!-- w-[100px] = 100px -->
</div>
```

Total fixe minimum : 36 + 12 + 48 + 12 + 100 + 12 + 100 = 320px. Sur un viewport de 320px avec `px-4` (32px total), il n'y a pas assez d'espace. Les elements debordent.

**Solution** : Passer a un layout empile sur mobile :
```tsx
<div className="flex flex-wrap items-center gap-2 md:gap-3">
```
ou separer date et heure sur deux lignes sur mobile.

---

### P1-3. Page événement publique : cover 1:1 trop grande sur mobile

**Fichier** : `/Users/dragos/AI Projects/the-playground/src/components/moments/moment-detail-view.tsx`, ligne 172

```tsx
<div className="order-2 flex w-full flex-col gap-4 lg:order-1 lg:w-[340px] ...">
```

Sur mobile (< lg), le layout est en colonne. La cover a `aspect-ratio: 1/1` et `w-full`. Sur un ecran de 375px avec `px-4`, la cover fait 343px x 343px. C'est un carre plein ecran qui pousse le contenu important (titre, date, inscription) sous la ligne de flottaison. Le meme probleme existe pour la page Communauté.

**Note** : L'ordre CSS (`order-2` pour la cover, `order-1` pour le contenu) fait que sur mobile, le contenu (titre, date, CTA) apparait **en premier** et la cover en second. C'est le bon comportement. Ce point est donc bien gere.

**Neanmoins** : Quand l'utilisateur scroll, la cover occupe 343px de hauteur verticale. Sur les pages Communauté (dashboard et publique), cela repousse les meta-informations et la timeline tres loin.

**Solution** : Limiter la hauteur de la cover sur mobile : `aspect-[4/3] lg:aspect-square` ou `max-h-[250px] lg:max-h-none` avec `object-cover`.

---

### P1-4. Formulaire événement : input titre sans taille minimum

**Fichier** : `/Users/dragos/AI Projects/the-playground/src/components/moments/moment-form.tsx`, ligne 162

```tsx
<input
  name="title"
  placeholder={t("form.eventName")}
  className="placeholder:text-muted-foreground/60 w-full border-none bg-transparent text-3xl font-bold tracking-tight outline-none lg:text-4xl"
/>
```

Cet input n'a pas de `text-base` sur mobile pour le placeholder, ce qui declenchera un zoom automatique sur iOS (Safari zoome les inputs dont la taille de police est < 16px). Ici le texte est `text-3xl` (30px) donc le contenu saisi ne zoomera pas, mais le **placeholder** en `text-3xl` pourrait etre etrangement grand par rapport aux standards de saisie mobile. Plus important : cet input n'a aucune bordure ni indicateur visuel de focus, ce qui peut etre confus sur mobile ou le feedback tactile est primordial.

**Solution** : Ajouter un indicateur de focus visible (ex: `focus:border-b focus:border-primary`) et eventuellement reduire la taille du placeholder sur mobile : `text-2xl md:text-3xl lg:text-4xl`.

---

### P1-5. ExplorerFilterBar : pills de categories debordent sans indication de scroll

**Fichier** : `/Users/dragos/AI Projects/the-playground/src/components/explorer/explorer-filter-bar.tsx`, ligne 38

```tsx
<div className="flex flex-wrap gap-2">
```

Avec 9 categories (Toutes, Tech, Design, Business, Sport & Bien-etre, Art & Culture, Science & Education, Social, Autre), le `flex-wrap` cree 2-3 lignes de boutons sur mobile. Ce n'est pas un debordement, mais l'espace vertical occupe est important.

**Solution alternative recommandee** : Utiliser un scroll horizontal avec `overflow-x-auto flex-nowrap` et un indicateur visuel de scroll (gradient fade) :
```tsx
<div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide md:flex-wrap md:overflow-visible">
```

---

### P1-6. CopyLinkButton : texte hard-code en francais

**Fichier** : `/Users/dragos/AI Projects/the-playground/src/components/moments/copy-link-button.tsx`, ligne 33

```tsx
{copied ? "Copie !" : "Copier le lien"}
```

Ce texte n'est pas i18n. C'est un bug fonctionnel (pas specifiquement mobile), mais il affecte l'experience EN mobile.

---

## Problemes mineurs (P2)

### P2-1. Touch targets des liens de breadcrumb

**Fichiers multiples** : `moment-detail-view.tsx`, page Communauté dashboard, page profil, etc.

```tsx
<div className="text-muted-foreground flex items-center gap-1 text-sm">
  <Link href="/dashboard" className="hover:text-foreground transition-colors">
    {tDashboard("title")}
  </Link>
  <ChevronRight className="size-3.5" />
```

Les liens de breadcrumb sont du texte `text-sm` (14px) sans padding supplementaire. La zone tactile est inferieure a 44x44px. Le `gap-1` (4px) entre les elements est tres serre.

**Solution** : Ajouter du padding vertical aux liens de breadcrumb : `py-1.5` pour agrandir la zone tactile, ou envelopper dans un conteneur avec `min-h-[44px]`.

---

### P2-2. Touch targets des boutons de filtre categorie

**Fichier** : `/Users/dragos/AI Projects/the-playground/src/components/explorer/explorer-filter-bar.tsx`, ligne 41

```tsx
<button className="rounded-full border px-3 py-1.5 text-sm ...">
```

La hauteur est `py-1.5` (12px) + texte `text-sm` (~20px) = ~32px. Inferieur au minimum recommande de 44px.

**Solution** : Augmenter a `py-2` minimum, ou ajouter `min-h-[44px]`.

---

### P2-3. Pill tabs : touch target trop petit

**Fichiers** : Dashboard (`page.tsx` ligne 81), Explorer (`page.tsx` ligne 74), page Communauté (tab selector)

```tsx
<Link className="rounded-full px-4 py-1 text-sm ...">
```

Le `py-1` (8px) + texte (20px) = ~28px de hauteur. Nettement en dessous de 44px.

**Solution** : `py-1.5` au minimum, idealement `py-2` pour les tabs.

---

### P2-4. Commentaire : textarea sans `text-base` sur mobile

**Fichier** : `/Users/dragos/AI Projects/the-playground/src/components/moments/comment-thread.tsx`, ligne 225

```tsx
<textarea
  className="... text-sm ..."
/>
```

`text-sm` = 14px. Sur iOS Safari, les inputs avec une taille de police < 16px declenchent un zoom automatique de la page. Le composant `Input` de shadcn utilise `text-base md:text-sm` pour eviter ce probleme, mais cette textarea custom ne le fait pas.

**Solution** : Ajouter `text-base md:text-sm` sur la textarea.

---

### P2-5. Delete comment button : touch target minuscule

**Fichier** : `/Users/dragos/AI Projects/the-playground/src/components/moments/comment-thread.tsx`, ligne 84

```tsx
<button className="text-muted-foreground hover:text-destructive text-xs transition-colors">
  {tCommon("delete")}
</button>
```

Un bouton "Supprimer" en `text-xs` (12px) sans padding. La zone tactile est d'environ 12x40px, largement sous le minimum de 44x44px.

**Solution** : Ajouter `px-2 py-1.5 -mx-2 -my-1.5` pour agrandir la zone tactile sans changer l'apparence visuelle.

---

### P2-6. Cancel registration button : touch target etroit

**Fichier** : `/Users/dragos/AI Projects/the-playground/src/components/moments/registration-button.tsx`, ligne 104

```tsx
<button className="text-muted-foreground hover:text-foreground text-xs ...">
  {t("public.cancelRegistration")}
</button>
```

Meme probleme que P2-5 : `text-xs` sans padding, zone tactile trop petite.

---

### P2-7. Page événement publique : iframe Google Maps non lazy-loadee efficacement

**Fichier** : `/Users/dragos/AI Projects/the-playground/src/components/moments/moment-detail-view.tsx`, ligne 332

```tsx
<iframe
  src={`https://maps.google.com/maps?q=...`}
  className="h-44 w-full border-0"
  loading="lazy"
/>
```

Le `loading="lazy"` est present, ce qui est bien. Cependant, sur mobile, l'iframe est chargee meme si elle est sous la ligne de flottaison. L'attribut `loading="lazy"` sur les iframes n'est pas supporte par tous les navigateurs mobiles.

**Impact** : Performance de chargement initial degradee sur connexions mobiles lentes.

---

### P2-8. Collapsible description : classe dynamique non generee par Tailwind

**Fichier** : `/Users/dragos/AI Projects/the-playground/src/components/moments/collapsible-description.tsx`, ligne 30

```tsx
className={`... ${expanded ? "" : `line-clamp-${maxLines}`}`}
```

La classe `line-clamp-5` est construite dynamiquement. Si Tailwind ne scanne pas cette classe generee dynamiquement, elle ne sera pas incluse dans le CSS. Le composant utilise un `style` inline en fallback (ligne 31), donc ca fonctionne, mais la classe CSS est morte.

---

### P2-9. Avatar upload overlay : hover-only sur mobile

**Fichier** : `/Users/dragos/AI Projects/the-playground/src/components/profile/avatar-upload.tsx`, lignes 106-119

```tsx
<span className={cn(
  "... bg-black/40",
  isPending ? "opacity-100" : "opacity-0 group-hover:opacity-100",
)}>
```

L'overlay avec l'icone camera n'apparait qu'au hover. Sur mobile, il n'y a pas de hover. L'utilisateur ne sait pas qu'il peut cliquer sur l'avatar pour changer la photo, sauf s'il n'a pas encore de photo (un lien texte "Ajouter" est alors affiche, lignes 123-130).

**Impact** : Probleme mineur car le lien texte est affiche pour les utilisateurs sans photo. Pour ceux qui ont deja un avatar et veulent le changer, la decouverte est degradee.

**Solution** : Ajouter un petit indicateur permanent sur mobile (ex: badge camera en bas a droite de l'avatar), ou afficher un lien texte "Modifier la photo" sous l'avatar meme quand une image existe.

---

### P2-10. Footer : liens legaux serres sur petit ecran

**Fichier** : `/Users/dragos/AI Projects/the-playground/src/components/site-footer.tsx`

```tsx
<nav className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
```

Le footer est bien concu avec `flex-wrap`. Cependant, `gap-x-4` (16px) et `text-xs` (12px) rendent les liens legaux tres petits et serres. La zone tactile de chaque lien est d'environ 12x(longueur texte) pixels.

**Solution** : `gap-x-5 gap-y-2` et ajouter `py-1` aux liens pour agrandir la zone tactile.

---

### P2-11. `muted-foreground` en light mode : contraste limite

**Fichier** : `/Users/dragos/AI Projects/the-playground/src/app/globals.css`, ligne 20

```css
--muted-foreground: oklch(0.1649 0.0352 281.8285);
```

En light mode, `muted-foreground` est identique a `foreground`. C'est correct pour le contraste. En revanche, en dark mode (ligne 56) :

```css
--muted-foreground: oklch(0.6245 0.05 278.1046);
```

Cette valeur produit un gris moyen (~62% lightness) sur un fond sombre (~16% lightness). Le ratio de contraste est d'environ 5.5:1, qui passe WCAG AA mais pourrait etre juste pour du texte `text-xs` (12px) sur un ecran mobile en plein soleil.

---

## Detail par page

### 1. Homepage

#### Ergonomie
- **P0-1** : `whitespace-nowrap` sur les 3 lignes du hero provoque un debordement horizontal sur viewport < 400px
- CTA "Commencer" : `size="lg"` avec `px-8 py-6` = bonne taille tactile (48px de hauteur)
- Steps "Comment ca marche" : icones `size-12` (48px) dans les dots = bonne taille tactile
- Piliers : cartes avec `p-8` = espacement genereux, bon pour mobile

#### Esthetique
- Le mockup iPhone est bien dimensionne (`w-[260px]`) et ne deborde pas
- La section "Comment ca marche" est bien structuree avec la ligne verticale a gauche
- Les piliers passent correctement de 3 colonnes a 1 colonne (`grid md:grid-cols-3`)
- Sections bien espacees (`py-24 md:py-32`)

#### Responsive
- `flex-col lg:flex-row` sur le hero : bon comportement, le mockup passe sous le texte
- `max-w-5xl` sur le conteneur principal avec `px-4` : bonne respiration
- Le mockup iPhone est centre sur mobile (`justify-center`)

#### Accessibilite
- Les CTAs sont des `<Link>` wrapes dans `<Button>` avec `asChild` : semantiquement correct
- Les gradients texte (`bg-clip-text text-transparent`) sont purement decoratifs, le texte sous-jacent est lisible par les screen readers
- Pas d'`alt` manquant (pas d'images, uniquement des SVG decoratifs et des gradients)

---

### 2. Page événement publique (`/m/[slug]`)

#### Ergonomie
- L'ordre mobile est correct : contenu (order-1) avant cover (order-2)
- CTA inscription : `size="lg" w-full` = bonne taille tactile plein ecran
- Meta rows (date, lieu) avec icones `size-9` (36px) : touche proche de 44px

#### Esthetique
- **P1-3** : Cover 1:1 full-width potentiellement trop grande, mais bien positionnee en fin de page mobile
- La carte d'inscription est bien visible avec sa bordure et son padding `p-4`
- Les badges et separateurs sont bien espaces

#### Responsive
- Le layout `flex-col lg:flex-row` fonctionne correctement
- La carte Google Maps (`h-44 w-full`) s'adapte bien
- Le lien video est `truncate` pour eviter le debordement

#### Accessibilite
- L'iframe Google Maps a un attribut `title` : bien
- Les icones decoratives n'ont pas d'`aria-label` mais sont accompagnees de texte
- Le bouton d'inscription a un texte clair

---

### 3. Page Communauté publique (`/circles/[slug]`)

#### Ergonomie
- Meme structure que la page événement : bon comportement mobile
- Les pill tabs pour A venir / Passes ont des touch targets trop petits (`py-1`)
- La timeline des événements utilise la meme colonne date de 100px (P1-1)

#### Esthetique
- L'absence de truncation sur les noms d'Organisateurs pourrait poser probleme si les noms sont longs
- Le badge categorie est bien positionne

#### Responsive
- Identique a la page Communauté dashboard : meme layout 2 colonnes avec bon reflow

---

### 4. Explorer / Découvrir

#### Ergonomie
- **P1-5** : Les pills de filtre categorie occupent beaucoup d'espace vertical en `flex-wrap`
- Les cartes Communauté et événement ont une bonne taille tactile (zones entierement cliquables)
- Le bouton "Créer une Communauté" est `shrink-0` : ne se comprime pas

#### Esthetique
- Grille `grid sm:grid-cols-2 lg:grid-cols-3` : 1 colonne sur mobile, correct
- Les cartes `PublicCircleCard` avec cover 1:1 + contenu : bien proportionnees
- Empty states centres avec texte `text-sm` : sobre et lisible

#### Responsive
- Le header "flex items-start justify-between" pourrait poser probleme si le titre est long et le bouton CTA prend trop de place. Le `gap-4` laisse de l'espace.
- Les pill tabs sont `w-fit` : elles ne debordent pas mais les touch targets sont trop petits

---

### 5. Dashboard

#### Ergonomie
- **P1-1** : Colonne date 100px rigide dans les `DashboardMomentCard`
- Les pill tabs ont des touch targets trop petits (`py-1`)
- Le bouton "Créer une Communauté" est bien positionne et accessible

#### Esthetique
- Le greeting avec prenom est un bon touche personnelle
- Les cartes timeline sont bien concues avec thumbnail gradient
- Le separateur entre "A venir" et "Passes" est elegant

#### Responsive
- `max-w-2xl` (672px) : le contenu est bien contenu sur tablette et mobile
- La tab "Mes Communautés" avec les `CircleCard` fonctionne bien en colonne

---

### 6. Profil

#### Ergonomie
- `max-w-lg` (512px) : bon pour mobile, bien centre
- AvatarUpload avec `size="xl"` (96px) : bonne taille tactile, bien centre
- Les inputs `firstName` et `lastName` utilisent le composant `Input` qui a `text-base md:text-sm` : pas de zoom iOS

#### Esthetique
- Layout single-column centre : ideal pour mobile
- Stats inline (N Communautés / N événements) : lisible meme sur 320px
- Meta rows avec icones : cohérentes avec les autres pages

#### Responsive
- Aucun probleme de debordement detecte
- Les boutons de formulaire sont en `flex gap-3` : ils ne debordent pas

---

### 7. Setup onboarding

#### Ergonomie
- Identique au profil, `max-w-lg`
- Le formulaire est minimaliste (prenom + nom) : ideal pour mobile
- Le header onboarding a logo statique + toggles uniquement

#### Esthetique
- Avatar centre + titre + description : hierarchie claire
- Pas de distraction (pas de nav, pas de footer)

#### Responsive
- Aucun probleme detecte

---

### 8. Formulaires (Communauté, événement)

#### Formulaire Communauté (`circle-form.tsx`)

- Labels + inputs standards avec composant `Input` (`text-base md:text-sm`)
- Selects (`category`, `visibility`) : fonctionnent bien sur mobile natif
- Boutons Submit/Cancel en `flex gap-3` : OK
- `space-y-6` : espacement genereux

#### Formulaire événement (`moment-form.tsx`)

- **P1-2** : Les lignes date/heure debordent sur < 375px
- **P1-4** : Le champ titre (`text-3xl` sans bordure) est atypique sur mobile
- Le layout 2 colonnes (`flex-col lg:flex-row`) fonctionne bien
- Le composant `MomentFormLocationRow` avec `Collapsible` : bonne UX mobile (contenu masque par defaut)
- Le composant `MomentFormOptionsSection` : idem, bonne UX avec contenu masque

---

### 9. Auth (sign-in)

#### Ergonomie
- `max-w-sm` (384px) centre verticalement et horizontalement : ideal
- Boutons OAuth `w-full` : bonne taille tactile
- Input email `type="email"` : ouvre le clavier email sur mobile
- L'input utilise le composant `Input` avec `text-base md:text-sm` : pas de zoom iOS

#### Esthetique
- Design epure, centre, avec separateur "ou"
- Hierarchie claire : OAuth en premier, magic link en second

#### Responsive
- `px-4` sur le conteneur parent : le formulaire respire

#### Accessibilite
- Les `required` sont presents sur l'input email
- Les boutons ont du texte clair

---

### 10. Pages legales

#### Ergonomie
- `prose dark:prose-invert` Tailwind Typography : rendu propre et lisible
- `max-w-3xl` avec `px-4` : bonne largeur de lecture mobile

#### Esthetique
- Titres h1/h2 automatiquement styles par `@tailwindcss/typography`
- Listes a puces : bien formatees

#### Responsive
- Aucun probleme detecte

---

### 11. Verification email / Erreur auth

- `max-w-sm` centre : identique a sign-in, aucun probleme
- Texte informatif lisible sur mobile

---

## Detail par composant partage

### SiteHeader

- **P0-4** : Navigation centrale visible mais ecrasee sur mobile, pas de menu hamburger
- Logo avec `shrink-0` : ne se comprime pas, correct
- Toggles (locale, theme) et UserMenu a droite : fonctionnels mais `gap-3` serre avec 4 elements (locale toggle, theme toggle, avatar + chevron)
- Le UserMenu dropdown s'ouvre correctement (`align="end"`) et le contenu est `w-56` (224px) : bien dimensionne pour mobile
- Le `DropdownMenuContent` de shadcn utilise `z-50` et se positionne correctement

### SiteFooter

- `flex-wrap` avec `justify-between` : le footer passe bien en 2 lignes sur mobile
- **P2-10** : Liens legaux petits et serres, touch targets insuffisants
- Le logo + copyright a gauche, liens a droite : bon pattern

### MomentDetailView

- Architecture `variant` (public/host) bien concue : un seul composant pour les 2 vues
- Le layout 2 colonnes avec inversion d'ordre CSS (`order-1`/`order-2`) est le bon pattern pour mobile-first
- **P1-3** : Cover 1:1 potentiellement grande, mais en second dans l'ordre mobile
- La liste des inscrits (`RegistrationsList`) en `flex-wrap gap-3` : les avatars wrappent correctement
- Le bloc lien partageable (host) avec URL tronquee (`truncate font-mono`) : pas de debordement

### CommentThread

- **P2-4** : Textarea en `text-sm` provoque un zoom iOS
- **P2-5** : Bouton "Supprimer" avec zone tactile trop petite
- Les commentaires en `flex gap-3` avec avatar + contenu : bon pattern mobile
- Le compteur de caracteres (`{content.length} / 2000`) est bien positionne

### RegistrationCard / RegistrationButton

- Le bouton principal (`size="lg" w-full`) : excellente taille tactile
- L'etat "inscrit" avec la barre de confirmation + bouton annulation : bien concu
- Le dialogue de confirmation AlertDialog utilise `max-w-[calc(100%-2rem)]` : bien adapte mobile

### AvatarUpload

- **P2-9** : Overlay hover-only, mais lien texte "Ajouter" visible sur mobile quand pas de photo
- L'input file est `sr-only` : accessible, pas de probleme mobile
- Le resize cote client (WebP 384x384) est une bonne pratique mobile (reduit le poids avant upload)

### AlertDialog

- `max-w-[calc(100%-2rem)]` : garantit 16px de marge de chaque cote sur mobile. Bon.
- Footer en `flex flex-col-reverse` : les boutons s'empilent verticalement sur mobile. Le bouton d'annulation apparait en second visuellement mais en premier dans le DOM (bon pour l'accessibilite).

### CircleAvatar, CircleCard, DashboardMomentCard

- `CircleCard` : layout horizontal (`flex items-start gap-4`) avec avatar `size-[72px]` et contenu flexible : fonctionne bien sur mobile
- `DashboardMomentCard` : meme probleme de colonne date 100px (P1-1)
- `CircleAvatar` : composant petit et autonome, aucun probleme mobile

### ExplorerFilterBar

- **P1-5** : `flex-wrap` cree plusieurs lignes, envisager un scroll horizontal
- **P2-2** : Touch targets des pills trop petits

---

## Recommandations prioritaires

### Top 10 des actions, classees par impact

| # | Priorite | Action | Fichiers concernes | Impact |
|---|----------|--------|-------------------|--------|
| 1 | P0 | **Retirer `whitespace-nowrap`** des 3 spans du hero homepage | `src/app/[locale]/page.tsx` L55-72 | Elimine le scroll horizontal sur toute la homepage mobile |
| 2 | P0 | **Ajouter un menu hamburger mobile** dans le SiteHeader (masquer nav centrale, ajouter Sheet/Drawer) | `src/components/site-header.tsx` | Rend la navigation accessible sur mobile |
| 3 | P0 | **Rendre l'admin sidebar responsive** : `hidden md:flex` + drawer mobile, ou transformer en top tabs | `src/components/admin/admin-sidebar.tsx`, `src/app/[locale]/(routes)/admin/layout.tsx` | Rend l'admin utilisable sur mobile |
| 4 | P0 | **Ajouter `overflow-x-auto`** sur les conteneurs de tables admin | Pages admin users/circles/moments | Empeche le debordement des tables |
| 5 | P1 | **Reduire la colonne date timeline** a `w-[72px]` sur mobile (`w-[72px] md:w-[100px]`) | `dashboard-moment-card.tsx`, `moment-timeline-item.tsx`, page Communauté publique | Donne plus d'espace au contenu des cartes |
| 6 | P1 | **Passer le formulaire date/heure en `flex-wrap`** ou layout empile sur mobile | `moment-form-date-card.tsx` | Empeche le debordement du formulaire événement |
| 7 | P2 | **Augmenter les touch targets** des pill tabs (`py-1` vers `py-2`), filtres categorie, liens breadcrumb, boutons delete commentaire | Multiples fichiers | Ameliore l'ergonomie tactile globale |
| 8 | P2 | **Ajouter `text-base md:text-sm`** a la textarea des commentaires | `comment-thread.tsx` L225 | Empeche le zoom iOS sur saisie |
| 9 | P2 | **i18n le CopyLinkButton** | `copy-link-button.tsx` L33 | Corrige le texte hard-code |
| 10 | P2 | **Ajouter un indicateur "Modifier photo"** visible sans hover sur l'avatar upload | `avatar-upload.tsx` | Ameliore la decouverte mobile |

---

## Notes positives

Ces elements sont bien faits et meritent d'etre mentionnes :

1. **Input component** : `text-base md:text-sm` dans `input.tsx` previent le zoom iOS. Bonne pratique.
2. **Ordre CSS des colonnes** : `order-1`/`order-2` bien utilise pour afficher le contenu avant la cover sur mobile.
3. **AlertDialog responsive** : `max-w-[calc(100%-2rem)]` garantit des marges sur mobile.
4. **Collapsible sections** dans le formulaire événement (location, options) : reduit la complexite visible sur mobile.
5. **Font loading** : `Inter` avec `next/font/google` = font optimisee, pas de FOUT.
6. **Gradients comme placeholders** : pas d'images a charger, excellent pour la performance mobile.
7. **`px-4` systematique** sur les conteneurs principaux : 16px de marge minimale, le contenu respire.
8. **`max-w-2xl`/`max-w-lg`/`max-w-5xl`** bien choisis selon les contextes : le contenu ne s'etire pas sur tablette.
9. **`truncate`** bien utilise sur les titres, emails, URLs longues : pas de debordement textuel.
10. **Lazy loading** sur l'iframe Google Maps.
