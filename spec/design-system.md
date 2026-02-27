# The Playground — Design System

> Document de référence exhaustif. Toute décision UI/UX DOIT se conformer à ce document.
> Dernière mise à jour : 2026-02-24

---

## Table des matières

1. [Philosophie & principes](#1-philosophie--principes)
2. [Tokens de design](#2-tokens-de-design)
   - 2.1 Couleurs
   - 2.2 Typographie
   - 2.3 Espacement
   - 2.4 Border radius
   - 2.5 Ombres & élévation
3. [Composants de base](#3-composants-de-base)
   - 3.1 Button
   - 3.2 Badge
   - 3.3 Avatar / UserAvatar / CircleAvatar
   - 3.4 Card
   - 3.5 Input
   - 3.6 Textarea
   - 3.7 Label
   - 3.8 Select
   - 3.9 Tabs
   - 3.10 Dialog
   - 3.11 Alert Dialog
   - 3.12 Separator
   - 3.13 Table
   - 3.14 Tooltip
   - 3.15 Dropdown Menu
4. [Composants métier](#4-composants-métier)
   - 4.1 CircleCard
   - 4.2 MomentCard
   - 4.3 MomentDetailView (layout 2 colonnes)
   - 4.4 RegistrationButton
   - 4.5 RegistrationsList
   - 4.6 CommentThread
   - 4.7 CircleMembersList
   - 4.8 CoverImagePicker
   - 4.9 PublicCircleCard (Découvrir)
   - 4.10 Admin StatsCard
5. [Patterns de layout](#5-patterns-de-layout)
   - 5.1 SiteHeader
   - 5.2 SiteFooter
   - 5.3 Layout 2 colonnes (Communauté & événement)
   - 5.4 Dashboard layout
   - 5.5 Onboarding layout
6. [Patterns UX récurrents](#6-patterns-ux-récurrents)
   - 6.1 Breadcrumb
   - 6.2 Meta row (icône + label + valeur)
   - 6.3 Empty state
   - 6.4 Cover image (carré 1:1)
   - 6.5 Gradients
   - 6.6 Glow blur (covers)
   - 6.7 Pill tabs
   - 6.8 Formulaires
   - 6.9 États de chargement et erreur
7. [Système de grille & responsive](#7-système-de-grille--responsive)
8. [Animations & transitions](#8-animations--transitions)
9. [Accessibilité](#9-accessibilité)
10. [i18n & terminologie](#10-i18n--terminologie)
11. [Problèmes connus / dette technique](#11-problèmes-connus--dette-technique)

---

## 1. Philosophie & principes

### Référence UI
- **Luma (lu.ma)** = référence UX/design (premium, friction zéro, mobile-first)
- **Meetup** = référence modèle fonctionnel (communautés persistantes)
- Règle : systématiquement challenger Luma. Si on peut faire mieux → proposer l'alternative.

### Principes structurants
- **Design premium par défaut** — chaque page doit être belle sans effort de l'organisateur
- **Mobile-first** — le parcours participant est optimisé pour mobile (lien WhatsApp → toujours sur mobile)
- **Marque discrète** — "Powered by The Playground" en footer, la communauté est au premier plan
- **Une seule couleur accent** — tout le système tourne autour du rose primary. Pas de rouge destructif séparé.
- **Un seul `default` par contexte** — jamais deux boutons primary sur la même page/section

### Ce qu'on ne fait PAS
- Pas d'algorithme de ranking
- Pas de feed social
- Pas de rouge pour les états dangereux (même rose = `--destructive`)
- Pas de doublon d'actions sur une même page

---

## 2. Tokens de design

### 2.1 Couleurs

Définis dans `src/app/globals.css`. Le design system utilise une **couleur accent unique** (rose).

#### Light mode (défaut)

| Token | Valeur oklch | Hex approx. | Usage |
|---|---|---|---|
| `--primary` | `oklch(0.6726 0.2904 341.4084)` | `#e8457a` | Couleur accent principale — boutons, badges, icônes |
| `--primary-foreground` | `oklch(1 0 0)` | `#ffffff` | Texte sur fond primary |
| `--destructive` | `oklch(0.6726 0.2904 341.4084)` | `#e8457a` | **Identique à primary** — même rose |
| `--destructive-foreground` | `oklch(1 0 0)` | `#ffffff` | Texte sur fond destructive |
| `--background` | `oklch(0.9816 0.0017 247.839)` | `#f5f5fa` | Fond de page |
| `--foreground` | `oklch(0.1649 0.0352 281.8285)` | `#1a1b2e` | Texte principal |
| `--card` | `oklch(1 0 0)` | `#ffffff` | Fond des cards |
| `--card-foreground` | `oklch(0.1649 0.0352 281.8285)` | `#1a1b2e` | Texte dans les cards |
| `--muted` | `oklch(0.9595 0.02 286.0164)` | `#f0eff7` | Fonds secondaires, tags |
| `--muted-foreground` | `oklch(0.5 0.04 278)` | `#6b6f87` | Texte atténué, labels, placeholders |
| `--secondary` | `oklch(0.9595 0.02 286.0164)` | `#f0eff7` | Identique à `--muted` |
| `--secondary-foreground` | `oklch(0.1649 0.0352 281.8285)` | `#1a1b2e` | Texte sur fond secondary |
| `--border` | `oklch(0.9205 0.0086 225.0878)` | `#e3e3ec` | Bordures |
| `--input` | `oklch(0.9205 0.0086 225.0878)` | `#e3e3ec` | Bordure des inputs |
| `--ring` | `oklch(0.6726 0.2904 341.4084)` | `#e8457a` | Focus ring — même rose |
| `--accent` | `oklch(0.8903 0.1739 171.269)` | `#6ee7d0` approx. | Teal mint — hover des boutons outline/ghost |
| `--accent-foreground` | `oklch(0.1649 0.0352 281.8285)` | `#1a1b2e` | Texte sur fond accent |
| `--radius` | `0.5rem` | 8px | Rayon de base |

> **Règle fondamentale** : `--destructive === --primary`. Le danger se communique par le contexte (mot "Supprimer", modale de confirmation), jamais par une couleur différente.

#### Dark mode

| Token | Valeur oklch | Hex approx. |
|---|---|---|
| `--background` | `oklch(0.1649 0.0352 281.8285)` | `#1a1b2e` |
| `--foreground` | `oklch(0.9513 0.0074 260.7315)` | `#f0f0f5` |
| `--card` | `oklch(0.2542 0.0611 281.1423)` | `#252638` |
| `--card-foreground` | `oklch(0.9513 0.0074 260.7315)` | `#f0f0f5` |
| `--border` | `oklch(0.3279 0.0832 280.789)` | `#383a55` |
| `--muted` | `oklch(0.2123 0.0522 280.9917)` | `#222336` |
| `--muted-foreground` | `oklch(0.6245 0.05 278.1046)` | `#8385a0` |
| `--secondary` | `oklch(0.2542 0.0611 281.1423)` | `#252638` |
| `--primary` | identique light | `#e8457a` (inchangé) |
| `--accent` | identique light | `#6ee7d0` (inchangé) |

#### Couleurs utilitaires (non-token, usage ciblé)

| Usage | Classe Tailwind | Valeur |
|---|---|---|
| Hover card | `hover:border-primary/30` | rose 30% opacité |
| Icône sur fond teinté | `bg-primary/10 text-primary` | fond rose 10% |
| Badge outline Organisateur | `border-primary/40 text-primary` | |
| Badge Annulé | `border-destructive/40 text-destructive` | |
| Inscrit (waitlisted) | `border-amber-500/30 bg-amber-500/5 text-amber-400` | amber — cas spécial |
| Full capacity | `text-amber-400` | amber — cas spécial |

> L'amber n'est utilisé que pour les états de liste d'attente et capacité pleine. Ce n'est pas un token global.

#### Charts (usage futur / admin)

| Token | Valeur |
|---|---|
| `--chart-1` | `oklch(0.6726 0.2904 341.4084)` — rose |
| `--chart-2` | `oklch(0.5488 0.2944 299.0954)` — violet |
| `--chart-3` | `oklch(0.8442 0.1457 209.2851)` — bleu clair |
| `--chart-4` | `oklch(0.8903 0.1739 171.269)` — teal |
| `--chart-5` | `oklch(0.9168 0.1915 101.407)` — jaune-vert |

---

### 2.2 Typographie

Police : **Inter** (system-ui fallback : `-apple-system, BlinkMacSystemFont, "Segoe UI"`)

| Niveau | Tailwind | Taille | Poids | Tracking |
|---|---|---|---|---|
| H1 — titre page | `text-4xl font-bold` | 36px | 700 | `-0.5px` |
| H2 — titre section | `text-2xl font-bold` | 28px | 700 | `-0.4px` |
| H3 — sous-section | `text-xl font-semibold` | 22px | 600 | `-0.3px` |
| Body | `text-sm` ou `text-base` | 14–16px | 400 | normal |
| Small / muted | `text-xs text-muted-foreground` | 12px | 400 | normal |
| Label uppercase | `text-[10px] font-bold uppercase tracking-widest` | 10px | 700 | `0.1em` |
| Mono | `font-mono text-sm` | 13px | 400 | normal |

**Poids utilisés**
- `font-medium` (500) : labels, badges, navigation, secondary headings
- `font-semibold` (600) : titres de cards, sections headers, noms
- `font-bold` (700) : titres de pages (h1, h2)
- `font-extrabold` (800) : logo uniquement

**Line-height**
- Corps de texte : `leading-relaxed` (1.6)
- Titres : `leading-tight` (1.2–1.3)
- Inline/compact : `leading-none`

**Troncature**
- Ligne unique : `truncate`
- N lignes : `line-clamp-1`, `line-clamp-2`, `line-clamp-3`

---

### 2.3 Espacement

Système basé sur Tailwind (multiples de 4px).

| Contexte | Valeur | Usage |
|---|---|---|
| Micro | `gap-1` (4px) | Icône + texte inline |
| Compact | `gap-2` (8px) | Éléments dense (badge + label) |
| Standard | `gap-3` (12px) | Items de liste, membres |
| Moyen | `gap-4` (16px) | Sections d'une card |
| Large | `gap-6` (24px) | Entre sections de card |
| XL | `gap-8` (32px) | Entre sections de page |
| Padding card | `p-4` à `p-6` | Selon importance |
| Padding form | `space-y-6` | Entre champs de formulaire |
| Padding page | `py-8 px-4` | Contenu de page |

---

### 2.4 Border radius

| Token | Valeur | Tailwind | Usage |
|---|---|---|---|
| `--radius-sm` | 4px | `rounded` | Tags petits |
| `--radius-md` | 6px | `rounded-md` | Boutons, inputs |
| `--radius-lg` | 8px | `rounded-lg` | Petites cards, icône boxes |
| `--radius-xl` | 12px | `rounded-xl` | Cards principales |
| `rounded-2xl` | 16px | — | Covers, comment boxes |
| `rounded-full` | 9999px | — | Avatars, badges pill, tabs pill |

---

### 2.5 Ombres & élévation

- Cards : `shadow-sm` (légère)
- Dropdowns / popovers : `shadow-md`
- Pas de `shadow-lg` ni `shadow-xl` en général
- Glow blur (covers) : `blur-xl opacity-60` sur pseudo-élément derrière la cover

---

## 3. Composants de base

### 3.1 Button

Fichier : `src/components/ui/button.tsx`

#### Hiérarchie normative — UN SEUL `default` PAR CONTEXTE

| Variant | Rôle | Quand l'utiliser |
|---|---|---|
| `default` (rose) | **Action principale unique** | S'inscrire, Créer un événement, Modifier, Enregistrer |
| `outline` | Action secondaire | Créer une Communauté (si Créer un événement est primary), Annuler |
| `ghost` | Tertiaire / utilitaire | Copier, Voir (toolbar), Se déconnecter, toggles UI |
| `destructive` | **Jamais en trigger visible** | Réservé à `AlertDialogAction` dans la modale de confirmation |
| `secondary` | Fond muted | Rare — actions non critiques sur fond coloré |
| `link` | Lien inline | Navigation dans du texte |

#### Tailles

| Size | Hauteur | Usage |
|---|---|---|
| `xs` | h-6 (24px) | Très compact, inline, rare |
| `sm` | h-8 (32px) | **Headers de page**, actions secondaires en haut |
| `default` | h-9 (36px) | **Formulaires** — Submit, Cancel |
| `lg` | h-10 (40px) | **CTA fullwidth** — S'inscrire, boutons principaux publics |
| `icon` | 36×36px | Bouton icône carré standard |
| `icon-xs` | 24×24px | Bouton icône très compact |
| `icon-sm` | 32×32px | Bouton icône petit |
| `icon-lg` | 40×40px | Bouton icône large |

#### Styles CSS complets

```
default:     bg-primary text-primary-foreground hover:bg-primary/90
destructive: bg-destructive text-white hover:bg-destructive/90
outline:     border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground
secondary:   bg-secondary text-secondary-foreground hover:bg-secondary/80
ghost:       hover:bg-accent hover:text-accent-foreground
link:        text-primary underline-offset-4 hover:underline
```

> **Hover outline/ghost** = teal accent (`--accent`), pas rose.

#### Patterns spéciaux

**Trigger "Supprimer"** — toujours :
```tsx
<Button
  variant="outline"
  size="sm"
  className="border-destructive/40 text-destructive hover:border-destructive hover:bg-destructive/10 hover:text-destructive"
>
  Supprimer
</Button>
```

**AlertDialogAction** (dans la modale) :
```tsx
<AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90">
  Supprimer définitivement
</AlertDialogAction>
```

**CTA fullwidth** (page publique S'inscrire) :
```tsx
<Button size="lg" className="w-full">S'inscrire</Button>
```

**Bouton Modifier** sur pages de détail :
```tsx
<Button variant="default" size="sm">Modifier</Button>
```

**Bouton Suivre** (cas spécial, sidebar Communauté) :
```tsx
// État inactif
<Button variant="outline" size="sm" className="w-full border-primary/40 text-primary hover:border-primary hover:bg-primary/5">
  Suivre
</Button>

// État actif
<Button variant="secondary" size="sm" className="w-full text-muted-foreground">
  Abonné·e ✓
</Button>
```

---

### 3.2 Badge

Fichier : `src/components/ui/badge.tsx`

#### Sémantique des variants

| Variant | Classes additionnelles | Usage |
|---|---|---|
| `default` | — | Engagement positif : **Inscrit**, **Publié** |
| `secondary` | — | Neutre/statut : **Participant**, **Liste d'attente** |
| `outline` + primary | `border-primary/40 text-primary` | Rôle : **Organisateur**, catégorie topic |
| `outline` + destructive | `border-destructive/40 text-destructive` | État négatif : **Annulé** |
| `outline` neutre | — (border-border) | État passé : **Passé** |

> Règle mnémotechnique : **fond plein = engagement actif, outline = tout le reste**.

#### Exemples

```tsx
<Badge variant="default">Publié</Badge>
<Badge variant="default">Inscrit</Badge>
<Badge variant="secondary">Liste d'attente</Badge>
<Badge variant="outline" className="border-primary/40 text-primary">Organisateur</Badge>
<Badge variant="outline" className="border-destructive/40 text-destructive">Annulé</Badge>
<Badge variant="outline">Passé</Badge>
```

---

### 3.3 Avatar / UserAvatar / CircleAvatar

#### Avatar (shadcn base)

Fichier : `src/components/ui/avatar.tsx`

- Base : `rounded-full overflow-hidden flex shrink-0`
- Taille par défaut : `size-8` (32px)
- Fallback : `bg-muted text-muted-foreground text-sm`
- Données attribut de taille : `data-[size=sm]:size-6`, `data-[size=lg]:size-10`

**AvatarGroup** (avatars empilés)
```tsx
<div className="flex -space-x-2">
  <Avatar className="ring-2 ring-background" />
  <Avatar className="ring-2 ring-background" />
  {/* ... */}
</div>
```

#### UserAvatar (custom)

Fichier : `src/components/user-avatar.tsx`

| Size prop | Classes | Pixels | Usage |
|---|---|---|---|
| `sm` | `size-7 text-xs` | 28px | Listes, commentaires, membres |
| `default` | `size-8 text-sm` | 32px | Standard |
| `lg` | `size-16 text-xl` | 64px | Pages profil |
| `xl` | `size-24 text-3xl` | 96px | En-tête profil (centré) |

Fallback : `bg-primary/10 text-primary font-medium` + initiales (prénom[0] + nom[0])

```tsx
<UserAvatar user={user} size="sm" />
<UserAvatar user={user} size="xl" />
```

#### CircleAvatar (custom)

Fichier : `src/components/circles/circle-avatar.tsx`

| Size prop | Classes | Pixels | Usage |
|---|---|---|---|
| `xs` | `size-4 text-[8px]` | 16px | Très compact |
| `sm` | `size-6 text-[10px]` | 24px | Timeline, cartes |
| `default` | `size-9 text-sm` | 36px | Standard |

Fond : gradient généré par `getMomentGradient(name)` ou image custom.
Forme : `rounded-full` avec première lettre du nom.

---

### 3.4 Card

Fichier : `src/components/ui/card.tsx`

**Structure complète**
```
Card (rounded-xl border shadow-sm bg-card)
├─ CardHeader (grid, gère optionnellement CardAction)
│  ├─ CardTitle (font-semibold leading-none)
│  ├─ CardDescription (text-sm text-muted-foreground)
│  └─ CardAction (right-aligned, col-start-2 row-span-2)
├─ CardContent (px-6)
└─ CardFooter (flex items-center px-6)
```

**Hover card** (cards cliquables) :
```tsx
<Card className="hover:border-primary/30 transition-colors cursor-pointer">
```

**Card sans padding custom** (composants métier) :
```tsx
<div className="rounded-xl border bg-card p-4 flex items-center gap-4">
  {/* layout custom */}
</div>
```

---

### 3.5 Input

Fichier : `src/components/ui/input.tsx`

- Hauteur : `h-9`
- Padding : `px-3 py-1`
- Border radius : `rounded-md`
- Focus : `focus-visible:ring-[3px] focus-visible:ring-ring/50`
- Erreur : `aria-invalid:ring-destructive/20 aria-invalid:border-destructive`
- Dark mode : `dark:bg-input/30`

**Avec icône**
```tsx
<div className="relative">
  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
  <Input className="pl-9" placeholder="Rechercher..." />
</div>
```

---

### 3.6 Textarea

Fichier : `src/components/ui/textarea.tsx`

- `min-h-16 w-full rounded-md border px-3 py-2`
- `field-sizing-content` — grandit avec le contenu
- Mêmes états focus/disabled que Input

**Avec compteur de caractères**
```tsx
<div className="relative">
  <Textarea maxLength={2000} />
  <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">
    {count}/2000
  </span>
</div>
```

---

### 3.7 Label

Fichier : `src/components/ui/label.tsx`

- `flex items-center gap-2 text-sm leading-none font-medium select-none`
- Désactivé via parent : `group-data-[disabled=true]:opacity-50`

```tsx
<Label htmlFor="firstName">Prénom</Label>
```

---

### 3.8 Select

Fichier : `src/components/ui/select.tsx`

| Size | Hauteur |
|---|---|
| `default` | h-9 |
| `sm` | h-8 |

- Trigger : `flex items-center justify-between gap-2 rounded-md border bg-transparent px-3`
- ChevronDownIcon automatique
- Items : `focus:bg-accent focus:text-accent-foreground`
- CheckIcon sur l'item sélectionné

---

### 3.9 Tabs

Fichier : `src/components/ui/tabs.tsx`

#### Variant `default` — Pill tabs (dashboard)

```tsx
<Tabs defaultValue="upcoming">
  <TabsList>  {/* bg-muted rounded-lg p-[3px] */}
    <TabsTrigger value="upcoming">À venir</TabsTrigger>
    <TabsTrigger value="past">Passés</TabsTrigger>
  </TabsList>
</Tabs>
```

Active : `bg-background text-foreground shadow-sm rounded-md`

#### Variant `line` — Underline tabs

```tsx
<TabsList variant="line">
  <TabsTrigger value="photos">Photos</TabsTrigger>
  <TabsTrigger value="upload">Importer</TabsTrigger>
</TabsList>
```

Active : pseudo-élément `after:` — barre en bas (horizontal) ou à droite (vertical)

**Règle** : les tabs pill sont utilisés dans le dashboard pour basculer entre vues (À venir / Passés). Les tabs line sont utilisés dans les dialogs (CoverImagePicker).

---

### 3.10 Dialog

Fichier : `src/components/ui/dialog.tsx`

**Layout adaptatif**
- Mobile : `fixed inset-0` (plein écran)
- Desktop : `top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] sm:max-w-lg rounded-lg`

**Structure**
```
DialogContent
├─ DialogHeader
│  ├─ DialogTitle (text-lg font-semibold)
│  └─ DialogDescription (text-sm text-muted-foreground)
├─ [Contenu custom]
└─ DialogFooter (flex flex-col-reverse gap-2 sm:flex-row sm:justify-end)
```

**Close button** : automatique en haut à droite (`showCloseButton = true`)

Animations : `animate-in fade-in-0 zoom-in-95` / `animate-out fade-out-0 zoom-out-95`

---

### 3.11 Alert Dialog

Fichier : `src/components/ui/alert-dialog.tsx`

**Usage** : confirmations destructives (supprimer, annuler)

| Size | Max-width |
|---|---|
| `default` | `sm:max-w-lg` |
| `sm` | `max-w-xs` (dialogue compact) |

**Structure type "Supprimer"**
```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="outline" size="sm"
      className="border-destructive/40 text-destructive hover:border-destructive hover:bg-destructive/10">
      Supprimer
    </Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Supprimer cet événement ?</AlertDialogTitle>
      <AlertDialogDescription>
        Cette action est irréversible.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Annuler</AlertDialogCancel>
      <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90">
        Supprimer définitivement
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

Footer avec `size="sm"` → `grid grid-cols-2` (côte à côte)

---

### 3.12 Separator

Fichier : `src/components/ui/separator.tsx`

- Horizontal (défaut) : `h-px w-full bg-border`
- Vertical : `h-full w-px bg-border`

Usage : séparation visuelle entre sections dans les cards/pages.

---

### 3.13 Table

Fichier : `src/components/ui/table.tsx`

- Wrapper : `overflow-x-auto` (scroll horizontal mobile)
- Row hover : `hover:bg-muted/50`
- Head cell : `h-10 px-2 text-left align-middle font-medium whitespace-nowrap`
- Body cell : `p-2 align-middle whitespace-nowrap`

Usage : liste des inscrits (dashboard), listes admin.

---

### 3.14 Tooltip

Fichier : `src/components/ui/tooltip.tsx`

- Contenu : `bg-primary text-primary-foreground` (rose)
- `px-3 py-1.5 text-xs rounded-md`
- Délai : Radix défaut (`delayDuration=0` pour usage immédiat)

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="ghost" size="icon">...</Button>
  </TooltipTrigger>
  <TooltipContent>Copier le lien</TooltipContent>
</Tooltip>
```

---

### 3.15 Dropdown Menu

Fichier : `src/components/ui/dropdown-menu.tsx`

- Content : `bg-popover rounded-md border shadow-md`
- Item : `flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm`
- Item focus : `focus:bg-accent focus:text-accent-foreground`
- Separator : `bg-border -mx-1 my-1 h-px`
- Destructive item : `text-destructive focus:text-destructive`

Usage : menu utilisateur dans SiteHeader.

---

## 4. Composants métier

### 4.1 CircleCard

Fichier : `src/components/circles/circle-card.tsx`

**Layout**
```
div (flex items-center gap-4 rounded-xl border p-4 hover:border-primary/30)
├─ Avatar/Cover (72×72 rounded-xl, gradient ou image)
├─ Content (flex-1, flex flex-col gap-1)
│  ├─ Name (font-semibold truncate) + role badge
│  ├─ Meta (visibilité, membres)
│  └─ Description (line-clamp-2 text-sm text-muted-foreground)
└─ Right column (Host seulement)
   └─ Button "Créer un événement" (variant="default" size="sm")
```

**Cover Avatar** : `size-[72px] rounded-xl` — image ou gradient. TOUJOURS carré.

---

### 4.2 MomentCard

Fichier : `src/components/moments/moment-card.tsx`

**Layout**
```
Card (hover:border-primary/30)
└─ CardHeader (flex items-start justify-between)
   ├─ Content
   │  ├─ Date (text-xs text-muted-foreground)
   │  ├─ Title (font-semibold truncate)
   │  └─ Location (text-xs text-muted-foreground flex items-center gap-1)
   ├─ Thumbnail (60×60 rounded-lg, gradient ou image)
   └─ Status badge (coin supérieur droit)
```

**Mapping statut → badge**
```
PUBLISHED → variant="default"                          (rose)
CANCELLED → variant="outline" + border-destructive/40  (rose outline)
PAST      → variant="outline"                          (neutre)
```

**Thumbnail** : `60×60px rounded-lg` — toujours carré.

---

### 4.3 MomentDetailView — Layout 2 colonnes

Fichier : `src/components/moments/moment-detail-view.tsx`

Ce layout est **partagé** entre la vue publique (`/m/[slug]`) et la vue organisateur (dashboard). Les différences sont contrôlées par prop `variant: "public" | "host"`.

**Structure macro**
```
div (max-w-5xl mx-auto px-4 py-8)
└─ div (flex flex-col lg:flex-row gap-8)
   ├─ LEFT (lg:w-[340px] shrink-0 flex flex-col gap-4 lg:sticky lg:top-6)
   │  ├─ Cover (w-full aspect-square rounded-2xl — CARRÉ 1:1)
   │  │  └─ Glow blur : absolute -bottom-3 inset-x-4 h-10 opacity-60 blur-xl
   │  └─ Communauté info card (clickable → page Communauté)
   └─ RIGHT (flex-1 flex flex-col gap-6)
      ├─ Breadcrumb (Organisateur seulement)
      ├─ Status badge
      ├─ Title (h1 text-4xl font-bold tracking-tight)
      ├─ Banner "Événement terminé" (si PAST, rétention → Communauté)
      ├─ Description (collapsible si longue)
      ├─ Meta rows (Quand / Où)
      ├─ Carte / iframe map (si adresse)
      ├─ Lien partageable (Host seulement)
      ├─ Carte inscription (Public seulement)
      ├─ Liste des inscrits
      └─ Fil de commentaires
```

**Meta row pattern**
```tsx
<div className="flex items-center gap-3">
  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
    <CalendarIcon className="size-4" />
  </div>
  <div>
    <div className="text-xs text-muted-foreground">Quand</div>
    <div className="text-sm font-medium">{formattedDate}</div>
  </div>
</div>
```

**Règle** : toute modification de design sur cette page DOIT s'appliquer aux deux vues (public + host), sauf éléments exclusifs listés ci-dessus.

---

### 4.4 RegistrationButton

Fichier : `src/components/moments/registration-button.tsx`

**États et rendu**

| État | Composant affiché |
|---|---|
| Événement payant | Bouton désactivé "Bientôt disponible" |
| Non authentifié | Lien → sign-in |
| Inscrit | Statut vert + boutons calendrier + "Annuler" |
| En liste d'attente | Statut amber + position dans la file + "Annuler" |
| Places disponibles | CTA principal "S'inscrire" (`size="lg" w-full`) |
| Complet (liste d'attente) | CTA "Rejoindre la liste d'attente" |
| Passé | Bouton désactivé |

**Bouton "Inscrit"**
```tsx
<Button variant="outline" size="sm"
  className="border-primary/30 bg-primary/5 text-primary">
  ✓ Inscrit
</Button>
```

**Bouton "En attente"**
```tsx
<Button variant="outline" size="sm"
  className="border-amber-500/30 bg-amber-500/5 text-amber-400">
  En liste d'attente (#{position})
</Button>
```

**Dialog annulation** : utilise AlertDialog standard avec trigger "outline + destructive".

---

### 4.5 RegistrationsList

Fichier : `src/components/moments/registrations-list.tsx`

**Layout**
```
div (border rounded-2xl p-6)
├─ Header (flex justify-between)
│  ├─ h2 + badge count (registered / waitlisted)
│  └─ Export CSV button (ghost, Host seulement)
├─ Separator
└─ Table (overflow-x-auto)
   └─ Colonnes : Nom / Email / Date / Statut / Check-in
```

**Badges de statut dans la liste**
```
CONFIRMED → Badge default (rose)
WAITLISTED → Badge secondary (muted)
CANCELLED  → Badge outline + destructive classes
```

---

### 4.6 CommentThread

Fichier : `src/components/moments/comment-thread.tsx`

**Layout**
```
div (border rounded-2xl p-6)
├─ h2 + count badge
├─ Liste de commentaires
│  └─ flex gap-3:
│     ├─ UserAvatar size="sm"
│     └─ div (flex-1)
│        ├─ Header : Nom (font-medium text-sm) + Temps relatif (text-xs muted) + Delete (ghost)
│        └─ Contenu (text-sm)
├─ Formulaire (si authentifié & événement non passé)
│  ├─ Textarea (rounded-xl resize-none)
│  └─ Actions : Submit (default) + compteur caractères
└─ Lien sign-in (si non authentifié)
```

**Delete** : icône uniquement, `text-muted-foreground hover:text-destructive`, sans texte.

---

### 4.7 CircleMembersList

Fichier : `src/components/circles/circle-members-list.tsx`

**Layout**
```
div
├─ h2 "Membres" + Badge (count, variant="secondary")
├─ Separator
└─ Sections Organisateurs / Membres
   └─ flex flex-wrap gap-3
      └─ Member item : flex items-center gap-2
         ├─ UserAvatar size="sm"
         ├─ Nom
         └─ Crown icon (text-primary size-3.5) si HOST
```

**Variant "organisateur"** : affiche aussi l'email (visible hosts seulement).

---

### 4.8 CoverImagePicker

Fichier : `src/components/circles/cover-image-picker.tsx`

**Trigger** : bouton cover preview
- `w-full aspect-square rounded-2xl overflow-hidden`
- Overlay hover : `bg-black/40 opacity-0 → opacity-100 transition-opacity`
- Icône "Modifier la couverture" au centre

**Dialog**
- Mobile : plein écran `w-screen h-dvh max-w-none`
- Desktop : `w-auto h-auto max-h-[90vh] max-w-lg sm:rounded-lg`

**Tabs**
- "Photos" (Unsplash) : grille `grid-cols-2 sm:grid-cols-4 gap-2`
- "Importer" : zone drag-and-drop `border-2 border-dashed hover:border-primary/50`

**Sélection** : `ring-2 ring-primary` + checkmark `bg-primary rounded-full`

**Upload** : max 5 Mo, resize client-side 800×800 WebP.

---

### 4.9 PublicCircleCard (Découvrir)

Fichier : `src/components/explorer/public-circle-card.tsx`

**Deux variantes**

`variant="card"` (grille Découvrir) :
```
div (rounded-xl border overflow-hidden hover:border-primary/30)
├─ Cover (w-full aspect-square)  — CARRÉ 1:1
└─ Content (p-4)
   ├─ Name (font-semibold)
   ├─ Member count + Event count (text-xs muted)
   └─ Description (line-clamp-2)
```

`variant="compact"` (sidebar / liste) :
```
div (flex items-center gap-3)
├─ CircleAvatar size="sm"
└─ Content
   ├─ Name (font-medium text-sm)
   └─ Meta (text-xs muted)
```

---

### 4.10 Admin StatsCard

Fichier : `src/components/admin/stats-card.tsx`

```
Card
└─ CardContent (flex gap-4 items-center)
   ├─ Icon box (size-10 rounded-lg bg-primary/10 text-primary)
   └─ div
      ├─ Value (text-2xl font-bold tabular-nums)
      ├─ Label (text-sm text-muted-foreground)
      └─ Delta (text-xs text-primary) — optionnel
```

---

## 5. Patterns de layout

### 5.1 SiteHeader

Fichier : `src/components/site-header.tsx`

```
header (sticky top-0 z-50 border-b/40 bg-background/80 backdrop-blur-sm)
  div (mx-auto flex h-14 max-w-5xl items-center px-4)
  ├─ Logo (left)
  │  ├─ PlayIcon : size-6 rounded-[5px] bg-gradient-to-br from-pink-500 to-violet-500
  │  └─ "the playground" : text-[15px] font-extrabold tracking-[-0.4px]
  ├─ Nav (hidden md:flex — centre)
  │  ├─ CompassIcon + "Découvrir" → /explorer
  │  └─ LayoutDashboardIcon + "Mon espace" → /dashboard
  ├─ flex-1 spacer (mobile)
  └─ Actions (right)
     ├─ LocaleToggle (desktop md+)
     ├─ ThemeToggle (desktop md+)
     ├─ UserMenu (si authentifié)
     └─ "Se connecter" button (si non authentifié)
```

**Navigation links**
```tsx
className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm font-medium transition-colors"
```

**Header hauteur** : `h-14` (56px)

---

### 5.2 SiteFooter

Fichier : `src/components/site-footer.tsx`

```
footer (border-t/40)
  div (mx-auto flex max-w-5xl items-center justify-between px-4 py-4 gap-3)
  ├─ Left : logo (size-5) + "© 2026 The Playground"
  └─ Right : liens (text-xs text-muted-foreground hover:text-foreground)
     ├─ À propos
     ├─ Changelog
     ├─ Mentions légales
     ├─ Confidentialité
     └─ CGU
```

---

### 5.3 Layout 2 colonnes (Communauté & événement)

**Utilisé sur** : page Communauté publique, page événement publique, vue événement organisateur.

```
div (max-w-5xl mx-auto px-4 py-8)
└─ div (flex flex-col lg:flex-row gap-8)
   ├─ LEFT (lg:w-[340px] shrink-0 lg:sticky lg:top-6 flex flex-col gap-4)
   └─ RIGHT (flex-1 flex flex-col gap-6)
```

**LEFT** contient : cover (carré 1:1), infos Communauté (organisateurs, stats, description), sidebar actions.
**RIGHT** contient : breadcrumb (si organisateur), titre, méta, contenu principal, actions.

**Règle cover** : toujours `aspect-square` (1:1). Jamais 16:9 ni autre ratio.

---

### 5.4 Dashboard layout

Fichier : `src/app/dashboard/(app)/layout.tsx`

```
SiteHeader
  main
    SiteFooter
```

Pages du dashboard : `max-w-5xl mx-auto px-4 py-8`

---

### 5.5 Onboarding layout

Fichier : `src/app/dashboard/(onboarding)/layout.tsx`

- Logo statique (non-lien) + locale/theme toggles uniquement
- Pas de navigation, pas de footer standard
- Page : `src/app/dashboard/(onboarding)/profile/setup/page.tsx`

---

## 6. Patterns UX récurrents

### 6.1 Breadcrumb

**Règles**
- Présent sur **toutes les pages dashboard** sauf : `/dashboard` (racine) et `profile/setup`
- Absent sur les pages publiques (`/m/[slug]`)

**Pattern CSS unifié**
```tsx
<nav className="text-muted-foreground flex items-center gap-1 text-sm">
  <Link href="/dashboard">Mon espace</Link>
  <ChevronRightIcon className="size-3.5" />
  <Link href={`/dashboard/circles/${circle.slug}`}>{circle.name}</Link>
  <ChevronRightIcon className="size-3.5" />
  <span className="text-foreground font-medium">{moment.title}</span>
</nav>
```

Séparateur : `ChevronRightIcon` (pas `/` ni `›`)

---

### 6.2 Meta row (icône + label + valeur)

Pattern universel pour les informations structurées (date, lieu, membres, etc.).

```tsx
<div className="flex items-center gap-3">
  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
    <CalendarIcon className="size-4" />
  </div>
  <div>
    <div className="text-xs text-muted-foreground">Quand</div>
    <div className="text-sm font-medium">{value}</div>
  </div>
</div>
```

Stack de meta rows : `flex flex-col gap-3`

---

### 6.3 Empty state

```tsx
<div className="border border-dashed rounded-xl px-6 py-12 text-center text-muted-foreground text-sm">
  <p>Aucun événement à venir pour le moment.</p>
  {/* CTA optionnel */}
  <Button variant="outline" size="sm" className="mt-4">Créer un événement</Button>
</div>
```

Caractéristiques : `border-dashed`, `rounded-xl`, texte centré, CTA optionnel.

---

### 6.4 Cover image — Règle absolue 1:1

> ⛔ **RÈGLE ABSOLUE** : toutes les covers sont en format carré **1:1**. Sans exception.

```tsx
<div className="w-full aspect-square rounded-2xl overflow-hidden">
  {coverImage
    ? <img src={coverImage} alt="" className="w-full h-full object-cover" />
    : <div className="w-full h-full" style={{ background: gradient }} />
  }
</div>
```

S'applique à : cards, pages Communauté, pages événement, mockups, OG images, CoverImagePicker.

---

### 6.5 Gradients

**5 gradients rotatifs** — assignés de façon déterministe par le nom de l'entité via `getMomentGradient(name)`.

| # | Direction | De | À |
|---|---|---|---|
| 1 | `135deg` | `#e8457a` (rose) | `#9333ea` (violet) |
| 2 | `135deg` | `#3b82f6` (bleu) | `#06b6d4` (cyan) |
| 3 | `135deg` | `#f59e0b` (amber) | `#ef4444` (rouge) |
| 4 | `135deg` | `#10b981` (vert) | `#3b82f6` (bleu) |
| 5 | `135deg` | `#8b5cf6` (violet) | `#ec4899` (pink) |

Usages : covers Communauté et événement sans image, avatars CircleAvatar.

---

### 6.6 Glow blur (derrière covers)

Effet de lueur colorée derrière les covers sur les pages detail.

```tsx
{/* Wrapper relatif */}
<div className="relative">
  {/* Glow */}
  <div
    className="absolute inset-x-4 -bottom-3 h-10 rounded-b-xl opacity-60 blur-xl"
    style={{ background: gradient }}
  />
  {/* Cover */}
  <div className="w-full aspect-square rounded-2xl overflow-hidden relative z-10">
    ...
  </div>
</div>
```

Événements passés : `opacity-70 grayscale` sur la cover.

---

### 6.7 Pill tabs (toggle À venir / Passés)

Utilisé dans le dashboard pour basculer entre vues de timeline.

```tsx
<div className="inline-flex border border-border rounded-full p-1 gap-0.5">
  <button className={cn(
    "px-4 py-1 rounded-full text-sm font-medium transition-all",
    active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
  )}>
    À venir
  </button>
  <button ...>Passés</button>
</div>
```

État actif : `bg-foreground text-background` (navy foncé sur blanc — pas rose).

---

### 6.8 Formulaires

**Structure standard**

```tsx
<form className="space-y-6">
  <div className="space-y-2">
    <Label htmlFor="field">Label</Label>
    <Input id="field" ... />
    {error && <p className="text-sm text-destructive">{error}</p>}
  </div>

  {/* Message d'erreur global */}
  {globalError && (
    <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {globalError}
    </div>
  )}

  {/* Message succès */}
  {saved && (
    <div className="rounded-lg bg-primary/10 px-4 py-3 text-sm text-primary">
      Sauvegardé avec succès.
    </div>
  )}

  <div className="flex gap-2">
    <Button type="submit">Enregistrer</Button>
    <Button type="button" variant="outline">Annuler</Button>
  </div>
</form>
```

**Règles formulaires**
- `space-y-6` entre les champs
- `space-y-2` entre label et input
- Bouton principal (`default`) + secondaire (`outline`) côte à côte
- Messages inline dans des `rounded-lg` teinté (pas de toasts pour les erreurs de formulaire)

---

### 6.9 États de chargement et erreur

**Skeleton** (chargement)
- Pas encore de composant Skeleton dédié — utiliser `animate-pulse bg-muted rounded-md`

**Toast** (notifications système)
- Non documenté explicitement — à définir lors de l'implémentation

**Erreur inline** (formulaires) :
```tsx
<p className="text-sm text-destructive">{errorMessage}</p>
```

**Erreur globale** (page) :
```tsx
<div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive border border-destructive/20">
  Une erreur est survenue.
</div>
```

---

## 7. Système de grille & responsive

### Breakpoints Tailwind

| Préfixe | Min-width | Usage typique |
|---|---|---|
| (aucun) | 0px | Mobile — base |
| `sm:` | 640px | Petites tablettes |
| `md:` | 768px | Tablettes / navigation |
| `lg:` | 1024px | Desktop — layout 2 colonnes |

### Contraintes max-width

- **Contenu principal** : `max-w-5xl` (1024px) centré `mx-auto`
- **Formulaires / modales** : `max-w-lg` (512px)
- **Profil** : `max-w-lg` (512px) — single column centré
- **Admin** : `max-w-5xl` (1024px)

### Patterns responsive fréquents

```tsx
// Layout 2 colonnes → colonne unique sur mobile
className="flex flex-col lg:flex-row gap-8"

// Navigation cachée sur mobile
className="hidden md:flex"

// Grille de cards
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"

// Boutons fullwidth sur mobile, auto sur desktop
className="w-full sm:w-auto"
```

### Sticky sidebar (pages Communauté/événement)

```tsx
className="lg:sticky lg:top-6 self-start"
```

---

## 8. Animations & transitions

### Transitions de base

```
transition-colors   — changement de couleur (hover)
transition-all      — tous les styles
duration: 150ms     — par défaut Tailwind (fast)
```

### Animations d'ouverture (Dialog / Dropdown / Popover)

```
animate-in fade-in-0 zoom-in-95         — apparition
animate-out fade-out-0 zoom-out-95      — disparition
slide-in-from-top-2                      — depuis le haut
slide-in-from-bottom-4                   — depuis le bas
duration-200
```

### Hover effects courants

```tsx
// Card hover
className="hover:border-primary/30 transition-colors"

// Link hover
className="hover:text-foreground transition-colors"

// Overlay hover (covers)
className="opacity-0 hover:opacity-100 transition-opacity"

// Scale subtle
className="hover:scale-[1.02] transition-transform"
```

---

## 9. Accessibilité

### Focus ring

Tous les éléments interactifs exposent un focus visible :
```
focus-visible:ring-[3px] focus-visible:ring-ring/50
focus-visible:border-ring
```

Ring color : `--ring` = `#e8457a` (rose primary)

### États aria

```tsx
aria-invalid:ring-destructive/20 aria-invalid:border-destructive   // inputs invalides
disabled:opacity-50 disabled:pointer-events-none                    // éléments désactivés
```

### Labels

- Tous les `<Input>` ont un `<Label htmlFor="...">` associé
- Boutons icône : toujours un `title` ou `aria-label`
- Images décoratives : `alt=""`
- Images significatives : `alt` descriptif

### Audit a11y

- `axe-core` intégré dans les tests Playwright E2E
- Focus visible sur tous les composants interactifs
- Contraste suffisant (rose sur blanc ≥ 4.5:1)

---

## 10. i18n & terminologie

### Règle fondamentale

- **Code** (variables, types, fonctions, fichiers, clés JSON) : toujours les termes anglais
- **Valeurs i18n** (ce que voit l'utilisateur) : FR ou EN selon la locale

### Mapping terminologique

| Code | FR (`fr.json`) | EN (`en.json`) |
|---|---|---|
| Circle | **Communauté** (féminin) | **Community** / Communities |
| Moment | **événement** (masculin) | **Event** / Events |
| Host | **Organisateur** | Host (inchangé) |
| Player | **Participant** | **Member** |
| Register | **S'inscrire** | **Join** |
| Dashboard | **Mon espace** | **Dashboard** |
| Explorer | **Découvrir** | **Explore** |

### Genre en français

- Circle/Communauté → **féminin** : "une Communauté", "cette Communauté", "Publié**e**"
- Moment/événement → **masculin** : "un événement", "Publié", "Annulé", "Passé"

### Statuts d'événement (traduits)

| Code | FR | EN |
|---|---|---|
| `PUBLISHED` | Publié | Published |
| `CANCELLED` | Annulé | Cancelled |
| `PAST` | Passé | Past |

### Statuts d'inscription (traduits)

| Code | FR | EN |
|---|---|---|
| `CONFIRMED` | Inscrit | Joined |
| `WAITLISTED` | Liste d'attente | Waitlisted |
| `CANCELLED` | Annulé | Cancelled |

### Clés i18n — conventions

- Clés en anglais camelCase : `myCircles`, `createEvent`, `signIn`
- Pas de traduction dans le code — toujours via `useTranslations()` / `getTranslations()`
- Fichiers : `src/i18n/messages/fr.json` et `src/i18n/messages/en.json`

---

## 11. Problèmes connus / dette technique

### Bug globals.css — `--muted-foreground` light mode

**Fichier** : `src/app/globals.css:20`

La valeur actuelle (`oklch(0.1649 0.0352 281.8285)`) est identique à `--foreground`. Ce devrait être `oklch(0.5 0.04 278)` (≈ `#6b6f87`). Le rendu visuel actuel fonctionne probablement grâce à une surcharge Tailwind, mais c'est une anomalie à corriger.

```css
/* Valeur actuelle (incorrecte) */
--muted-foreground: oklch(0.1649 0.0352 281.8285);

/* Valeur correcte */
--muted-foreground: oklch(0.5 0.04 278);
```

### Feature "Suivre" — non implémentée

Le bouton Suivre (abonnement aux mises à jour d'une Communauté sans inscription à un événement) est documenté dans le style guide HTML comme pattern mais n'est pas encore implémenté. À implémenter en Phase 2.

### Skeleton / loading states — non standardisés

Pas de composant Skeleton dédié. Les états de chargement utilisent `animate-pulse` directement. À standardiser.

### Toast / notifications système — à définir

Aucun pattern de toast défini. À intégrer lors de l'implémentation des retours utilisateur (ex : "Lien copié", "Profil sauvegardé").

---

*Ce document est la source de vérité du design system. Toute divergence entre ce document et le code constitue un bug à corriger.*
