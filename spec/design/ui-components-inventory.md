# Inventaire UI — The Playground

> Inventaire exhaustif des composants UI pour export Figma.
> Généré le 2026-03-16.

---

## Sommaire

1. [Composants atomiques shadcn/ui](#1-composants-atomiques-shadcnui)
2. [Avatars & Identité visuelle](#2-avatars--identité-visuelle)
3. [Badges thématiques](#3-badges-thématiques)
4. [Cartes (Cards)](#4-cartes-cards)
5. [Formulaires complexes](#5-formulaires-complexes)
6. [Actions & Interactions](#6-actions--interactions)
7. [Listes & Données](#7-listes--données)
8. [Commentaires & Contenu](#8-commentaires--contenu)
9. [Vue Détail Événement](#9-vue-détail-événement)
10. [Profil & Paramètres](#10-profil--paramètres)
11. [Navigation & Layout](#11-navigation--layout)
12. [Administration](#12-administration)
13. [Authentification](#13-authentification)
14. [Aide](#14-aide)
15. [Providers & Utilitaires](#15-providers--utilitaires)
16. [Composants par page](#16-composants-par-page)

---

## 1. Composants atomiques shadcn/ui

### Button
**Fichier** : `src/components/ui/button.tsx`
**Type** : Atomique — Contrôle fondamental

| Prop | Type | Valeurs |
|------|------|---------|
| `variant` | string | `default` (rose primaire), `destructive`, `outline`, `secondary`, `ghost`, `link` |
| `size` | string | `xs`, `sm`, `default`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg` |
| `asChild` | boolean | Délègue le rendu à l'enfant (Radix Slot) |
| `disabled` | boolean | État désactivé |

**États visuels** : default, hover, active, disabled, focus-visible
**Utilisation** : CTA primaire (S'inscrire, Créer), actions secondaires, navigation, actions destructives

---

### Badge
**Fichier** : `src/components/ui/badge.tsx`
**Type** : Atomique — Étiquette

| Prop | Type | Valeurs |
|------|------|---------|
| `variant` | string | `default`, `secondary`, `destructive`, `outline`, `ghost`, `link` |
| `asChild` | boolean | Délègue le rendu |

**Utilisation** : Statuts événement (Brouillon, Publié, Annulé, Passé), rôles (Organisateur/Participant), métadonnées

---

### Card
**Fichier** : `src/components/ui/card.tsx`
**Type** : Composé — Conteneur

**Sous-composants** : `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`
**Utilisation** : Pages événements, listes de moments, sections dashboard

---

### Input
**Fichier** : `src/components/ui/input.tsx`
**Type** : Atomique — Formulaire

| Prop | Type | Valeurs |
|------|------|---------|
| `type` | string | text, email, number, password, url… |
| `placeholder` | string | — |
| `disabled` | boolean | — |
| `aria-invalid` | boolean | État erreur |

**États visuels** : default, focus, disabled, invalid
**Utilisation** : Tous les formulaires (Communauté, Événement, Profil)

---

### Textarea
**Fichier** : `src/components/ui/textarea.tsx`
**Type** : Atomique — Formulaire

| Prop | Type | Valeurs |
|------|------|---------|
| `placeholder` | string | — |
| `disabled` | boolean | — |
| `field-sizing-content` | CSS | Auto-resize selon contenu |

**Utilisation** : Descriptions longues (événement, communauté, commentaires)

---

### Label
**Fichier** : `src/components/ui/label.tsx`
**Type** : Atomique — Formulaire

| Prop | Type | Valeurs |
|------|------|---------|
| `htmlFor` | string | ID du champ associé |
| `disabled` | boolean | — |

**Utilisation** : Étiquettes de champs formulaires

---

### Avatar
**Fichier** : `src/components/ui/avatar.tsx`
**Type** : Atomique

**Sous-composants** : `Avatar`, `AvatarImage`, `AvatarFallback`, `AvatarBadge`, `AvatarGroup`, `AvatarGroupCount`

| Prop | Type | Valeurs |
|------|------|---------|
| `size` | string | `sm`, `default`, `lg` |

**Utilisation** : Profils utilisateurs, listes de participants, avatars groupés (social proof)

---

### Select
**Fichier** : `src/components/ui/select.tsx`
**Type** : Composé — Formulaire

**Sous-composants** : `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectGroup`, `SelectLabel`, `SelectSeparator`, `SelectScrollUpButton`, `SelectScrollDownButton`

| Prop | Type | Valeurs |
|------|------|---------|
| `size` | string | `sm`, `default` |
| `disabled` | boolean | — |

**Utilisation** : Catégories, devises, type de localisation, options événements

---

### Dialog
**Fichier** : `src/components/ui/dialog.tsx`
**Type** : Composé — Modal

**Sous-composants** : `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`, `DialogClose`, `DialogPortal`, `DialogOverlay`

| Prop | Type | Valeurs |
|------|------|---------|
| `showCloseButton` | boolean | Défaut `true` |

**Utilisation** : Modales d'édition, dialogues informatifs

---

### AlertDialog
**Fichier** : `src/components/ui/alert-dialog.tsx`
**Type** : Composé — Modal de confirmation

**Sous-composants** : `AlertDialog`, `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogFooter`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogMedia`

| Prop | Type | Valeurs |
|------|------|---------|
| `size` | string | `default`, `sm` |

**Utilisation** : Confirmations destructives (supprimer, annuler événement), avertissements

---

### Sheet
**Fichier** : `src/components/ui/sheet.tsx`
**Type** : Composé — Tiroir latéral

**Sous-composants** : `Sheet`, `SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetFooter`, `SheetTitle`, `SheetDescription`, `SheetClose`, `SheetOverlay`, `SheetPortal`

| Prop | Type | Valeurs |
|------|------|---------|
| `side` | string | `top`, `right`, `bottom`, `left` |
| `showCloseButton` | boolean | Défaut `true` |

**Utilisation** : Navigation mobile, panneaux latéraux

---

### Tabs
**Fichier** : `src/components/ui/tabs.tsx`
**Type** : Composé

**Sous-composants** : `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`

| Prop | Type | Valeurs |
|------|------|---------|
| `orientation` | string | `horizontal`, `vertical` |
| `variant` | string | `default` (fond muted), `line` (soulignement) |

**Utilisation** : Navigation Dashboard (Mes événements / Mes communautés), page Découvrir, page Communauté

---

### DropdownMenu
**Fichier** : `src/components/ui/dropdown-menu.tsx`
**Type** : Composé — Menu contextuel

**Sous-composants** : `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuShortcut`, `DropdownMenuGroup`, `DropdownMenuSub`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent`

| Prop sur item | Type | Valeurs |
|---------------|------|---------|
| `variant` | string | `default`, `destructive` |
| `inset` | boolean | Indentation |

**Utilisation** : Menu utilisateur, actions contextuelles, options

---

### Popover
**Fichier** : `src/components/ui/popover.tsx`
**Type** : Composé — Flottant

**Sous-composants** : `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverAnchor`, `PopoverHeader`, `PopoverTitle`, `PopoverDescription`

| Prop | Type | Valeurs |
|------|------|---------|
| `align` | string | `center`, `start`, `end` |
| `sideOffset` | number | Espacement depuis le trigger |

**Utilisation** : Infobulles enrichies, menus contextuels flottants

---

### Tooltip
**Fichier** : `src/components/ui/tooltip.tsx`
**Type** : Composé — Infobulle simple

**Sous-composants** : `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider`
**Utilisation** : Prix "Coming soon", info capacité, actions avec icône seule

---

### Calendar
**Fichier** : `src/components/ui/calendar.tsx`
**Type** : Composé — Sélecteur de dates
**Utilisation** : Sélection de dates dans formulaires événement

---

### Separator
**Fichier** : `src/components/ui/separator.tsx`
**Type** : Atomique — Délimiteur

| Prop | Type | Valeurs |
|------|------|---------|
| `orientation` | string | `horizontal`, `vertical` |
| `decorative` | boolean | — |

**Utilisation** : Délimitations visuelles entre sections

---

### Collapsible
**Fichier** : `src/components/ui/collapsible.tsx`
**Type** : Composé — Repliable

**Sous-composants** : `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent`
**Utilisation** : Section options événement, localisation avancée

---

### Switch
**Fichier** : `src/components/ui/switch.tsx`
**Type** : Atomique — Formulaire

| Prop | Type | Valeurs |
|------|------|---------|
| `disabled` | boolean | — |
| `checked` | boolean | — |

**Utilisation** : Toggles booléens (visibilité communauté, préférences notifications)

---

### Skeleton
**Fichier** : `src/components/ui/skeleton.tsx`
**Type** : Atomique — Placeholder de chargement
**Utilisation** : États de chargement (listes, cartes, profils)

---

### PlaceAutocompleteInput
**Fichier** : `src/components/ui/place-autocomplete-input.tsx`
**Type** : Composé — Formulaire personnalisé
**Utilisation** : Autocomplétion d'adresses (localisation événement via Google Maps API)

---

## 2. Avatars & Identité visuelle

### UserAvatar
**Fichier** : `src/components/user-avatar.tsx`
**Type** : Composé

| Prop | Type | Valeurs |
|------|------|---------|
| `name` | string \| null | Nom complet utilisateur |
| `email` | string | Email (fallback pour initiale) |
| `image` | string \| null | URL photo de profil |
| `size` | string | `sm`, `default`, `lg`, `xl` |

**Logique** : Fallback initiales (2 premières lettres du nom, ou 1ère lettre de l'email)
**Utilisation** : Profil utilisateur dans tous les contextes (header, listes, commentaires)

---

### CircleAvatar
**Fichier** : `src/components/circles/circle-avatar.tsx`
**Type** : Composé

| Prop | Type | Valeurs |
|------|------|---------|
| `name` | string | Nom de la communauté |
| `image` | string \| null | URL image de couverture |
| `size` | string | `xs`, `sm`, `default` |

**Logique** : Gradient déterministe basé sur le nom, ou image si fournie
**Utilisation** : Badge communauté dans cartes, liste members, dashboard

---

## 3. Badges thématiques

### DraftBadge
**Fichier** : `src/components/badges/draft-badge.tsx`
**Type** : Atomique — Statut

| Prop | Type | Valeurs |
|------|------|---------|
| `label` | string | Texte du badge ("Brouillon" / "Draft") |
| `variant` | string | `cover` (overlay sur image), `badge` (inline) |

**Variante `cover`** : Overlay noir/80% avec border primaire et icône FileEdit
**Variante `badge`** : Badge outline inline
**Utilisation** : Statut Brouillon sur cartes et pages événement

---

### CategoryBadge
**Fichier** : `src/components/badges/category-badge.tsx`
**Type** : Atomique — Métadonnée

| Prop | Type | Valeurs |
|------|------|---------|
| `label` | string | Nom de la catégorie (TECH, DESIGN, SPORT…) |
| `className` | string | Classes additionnelles |

**Utilisation** : Catégories dans cartes Communauté et Événement (Explorer)

---

### DemoBadge
**Fichier** : `src/components/badges/demo-badge.tsx`
**Type** : Atomique — Marqueur spécial
**Utilisation** : Marque les données de démonstration sur les cartes

---

## 4. Cartes (Cards)

### CircleCard
**Fichier** : `src/components/circles/circle-card.tsx`
**Type** : Composé — Carte communauté (dashboard)

| Prop | Type | Valeurs |
|------|------|---------|
| `circle` | Circle | Données de la communauté |
| `href` | string | Lien cible |
| `role` | CircleMemberRole | HOST, PLAYER |
| `memberCount` | number | — |

**Sections** : CircleAvatar (72×72), Titre, Icône visibilité (PUBLIC/PRIVATE), Compteur membres, Description
**Variantes** : HOST (badge rôle + bouton "Créer événement"), PLAYER (badge rôle)
**États** : hover (`border-primary/30`)
**Utilisation** : Dashboard — liste des communautés de l'utilisateur

---

### PublicCircleCard
**Fichier** : `src/components/explorer/public-circle-card.tsx`
**Type** : Composé — Carte communauté (page Découvrir)

| Prop | Type | Valeurs |
|------|------|---------|
| `circle` | PublicCircle | Données publiques de la communauté |
| `membershipRole` | CircleMemberRole \| null | Rôle actuel de l'utilisateur |

**Layout** :
- Mobile : couverture 72px + body (badges + titre + description + métadonnées)
- Desktop : couverture 120px + body + colonne droite (prochain événement ou "Aucun événement")

**Sections** :
- Couverture carrée (gradient ou image)
- Badges : catégorie + rôle utilisateur
- Titre pleine largeur
- Description (2 lignes max, tronquée)
- Métadonnées : localisation, compteur membres, nombre d'événements à venir
- Colonne droite (desktop) : prochain événement avec date et titre

**Utilisation** : Page Découvrir — grille publique des communautés

---

### MomentCard
**Fichier** : `src/components/moments/moment-card.tsx`
**Type** : Composé — Carte événement (dashboard)

| Prop | Type | Valeurs |
|------|------|---------|
| `moment` | Moment | Données de l'événement |
| `circleSlug` | string | — |

**Sections** : Titre, Description, Date, Badge statut
**Badge statut** : DRAFT (outline), PUBLISHED (default), CANCELLED (destructive), PAST (secondary)
**Utilisation** : Dashboard — liste des événements d'une communauté

---

### PublicMomentCard
**Fichier** : `src/components/explorer/public-moment-card.tsx`
**Type** : Composé — Carte événement (page Découvrir)

| Prop | Type | Valeurs |
|------|------|---------|
| `moment` | PublicMoment | Données publiques de l'événement |
| `registrationStatus` | RegistrationStatus \| null | Statut d'inscription de l'utilisateur |
| `isOrganizer` | boolean | — |

**Layout** :
- Mobile : couverture 72px + body
- Desktop : couverture 120px + body + colonne droite (date badge vertical)

**Sections** :
- Couverture carrée (gradient ou image)
- Badges : catégorie + rôle/statut + ville
- Nom de la communauté
- Titre de l'événement
- Description courte
- Métadonnées : date, lieu, places restantes
- Colonne droite (desktop) : badge date (jour + mois en format vertical)

**Utilisation** : Page Découvrir — grille publique des événements

---

### DashboardCircleCard
**Fichier** : `src/components/circles/dashboard-circle-card.tsx`
**Type** : Composé — Carte compacte
**Utilisation** : Dashboard — affichage compact dans liste communautés

---

### DashboardMomentCard
**Fichier** : `src/components/moments/dashboard-moment-card.tsx`
**Type** : Composé — Carte compacte
**Utilisation** : Dashboard — affichage compact dans timeline événements

---

## 5. Formulaires complexes

### CircleForm
**Fichier** : `src/components/circles/circle-form.tsx`
**Type** : Composé — Formulaire communauté

| Prop | Type | Valeurs |
|------|------|---------|
| `circle` | Circle \| undefined | Données pour l'édition (vide = création) |
| `action` | function | Server action de soumission |

**Champs** :
- Nom (Input)
- Description (Textarea)
- Visibilité (Select : PUBLIC / PRIVATE)
- Catégorie (Select : TECH, DESIGN, BUSINESS, SPORT_WELLNESS, ART_CULTURE, SCIENCE_EDUCATION, SOCIAL, OTHER)
- Catégorie personnalisée (Input, visible si catégorie = OTHER)
- Image de couverture (CoverImagePicker)
- Ville (Input)

**Utilisation** : Créer et éditer une communauté

---

### MomentForm
**Fichier** : `src/components/moments/moment-form.tsx`
**Type** : Composé — Formulaire événement (complexe)

| Prop | Type | Valeurs |
|------|------|---------|
| `moment` | Moment \| undefined | Données pour l'édition |
| `circleSlug` | string | — |
| `circleName` | string | — |
| `action` | function | Server action de soumission |

**Champs** :
- Titre (Input)
- Description (Textarea)
- Date/heure début et fin (MomentFormDateCard)
- Type de localisation (MomentFormLocationRow : ONLINE / HYBRID / IN_PERSON)
- Adresse (PlaceAutocompleteInput, si IN_PERSON ou HYBRID)
- Lien vidéo (Input, si ONLINE ou HYBRID)
- Image de couverture (CoverImagePicker)
- Options avancées (MomentFormOptionsSection : prix, capacité)
- Radar de complétude (MomentFormRadar)

**Utilisation** : Créer et éditer un événement

---

### CoverImagePicker
**Fichier** : `src/components/circles/cover-image-picker.tsx`
**Type** : Composé — Sélecteur d'image

**Modes** :
- Upload local (fichier)
- Recherche Unsplash
- Supprimer l'image existante

**Utilisation** : Formulaire Communauté et Événement — image de couverture carrée 1:1

---

### MomentFormDateCard
**Fichier** : `src/components/moments/moment-form-date-card.tsx`
**Type** : Composé — Sélecteur date/heure
**Champs** : Date début, Heure début, Date fin, Heure fin
**Utilisation** : Formulaire événement

---

### MomentFormLocationRow
**Fichier** : `src/components/moments/moment-form-location-row.tsx`
**Type** : Composé — Localisation

**Types de localisation** : IN_PERSON, ONLINE, HYBRID
**Champs conditionnels** : adresse (IN_PERSON/HYBRID), lien vidéo (ONLINE/HYBRID)
**Utilisation** : Formulaire événement

---

### MomentFormOptionsSection
**Fichier** : `src/components/moments/moment-form-options-section.tsx`
**Type** : Composé — Section repliable

**Options** :
- Prix (Input, actuellement disabled avec tooltip "Coming soon")
- Capacité maximale (Input nombre)

**Utilisation** : Formulaire événement — options avancées

---

### MomentFormRadar
**Fichier** : `src/components/moments/moment-form-radar.tsx`
**Type** : Composé — Indicateur de complétude
**Logique** : Score visuel basé sur les champs remplis (titre, description, cover, date, lieu…)
**Utilisation** : Formulaire événement — feedback visuel de qualité

---

## 6. Actions & Interactions

### RegistrationButton
**Fichier** : `src/components/moments/registration-button.tsx`
**Type** : Composé — CTA principal page événement

| Prop | Type | Valeurs |
|------|------|---------|
| `momentId` | string | — |
| `circleId` | string | — |
| `isAuthenticated` | boolean | — |
| `existingRegistration` | Registration \| null | — |
| `isFull` | boolean | — |
| `spotsRemaining` | number \| null | — |
| `waitlistPosition` | number \| null | — |

**États visuels** :
- Non-auth → Lien vers sign-in (Button asChild)
- Événement payant → Disabled "Coming soon"
- Inscrit REGISTERED → Confirmation + boutons calendrier + Annuler
- En attente WAITLISTED → Position liste d'attente + Annuler
- Places disponibles → S'inscrire (size="lg", w-full)
- Complet → Rejoindre la liste d'attente

**Utilisation** : Page événement publique — CTA principal

---

### PublishMomentButton
**Fichier** : `src/components/moments/publish-moment-button.tsx`
**Type** : Composé — Action publication

| Prop | Type | Valeurs |
|------|------|---------|
| `momentId` | string | — |
| `circleSlug` | string | — |
| `momentSlug` | string | — |

**États** : idle, loading (pending), published (désactivé)
**Utilisation** : Dashboard événement (Brouillon) — Publier

---

### DeleteMomentDialog
**Fichier** : `src/components/moments/delete-moment-dialog.tsx`
**Type** : Composé — Confirmation destructive
**Trigger** : Button outline destructive
**Modal** : AlertDialog avec confirmation texte
**Utilisation** : Dashboard événement — Supprimer

---

### BroadcastMomentDialog
**Fichier** : `src/components/moments/broadcast-moment-dialog.tsx`
**Type** : Composé — Notification groupée

**Champs** : Objet, Corps du message
**Cible** : Tous les inscrits (REGISTERED + WAITLISTED)
**Utilisation** : Dashboard événement — Envoyer email à tous les participants

---

### CopyLinkButton
**Fichier** : `src/components/moments/copy-link-button.tsx`
**Type** : Composé — Partage
**États** : idle (icône Link), copied (icône Check + feedback visuel)
**Utilisation** : Page événement et dashboard — Copier lien public

---

### AddToCalendarButtons
**Fichier** : `src/components/moments/add-to-calendar-buttons.tsx`
**Type** : Composé — Intégration calendrier

**Cibles** :
- Google Calendar (lien externe)
- Apple Calendar (.ics download)
- Fichier ICS générique (.ics download)

**Utilisation** : Page événement après inscription — Ajouter au calendrier

---

### JoinCircleButton
**Fichier** : `src/components/circles/join-circle-button.tsx`
**Type** : Composé — Action adhésion
**États** : Non-membre (S'inscrire), loading, membre (désactivé)
**Utilisation** : Page communauté publique — Rejoindre la communauté

---

### JoinCircleByInviteForm
**Fichier** : `src/components/circles/join-circle-by-invite-form.tsx`
**Type** : Composé — Formulaire invitation

| Prop | Type | Valeurs |
|------|------|---------|
| `token` | string | Token d'invitation |
| `isAuthenticated` | boolean | — |
| `alreadyMember` | boolean | — |
| `circleSlug` | string | — |

**États** :
- Non-auth → Se connecter pour rejoindre
- Déjà membre → Message "Vous êtes déjà membre"
- Nouveau → Bouton "Rejoindre la communauté"

**Utilisation** : Page `/circles/join/:token`

---

### LeaveCircleDialog
**Fichier** : `src/components/circles/leave-circle-dialog.tsx`
**Type** : Composé — Confirmation
**Utilisation** : Page communauté — Quitter la communauté

---

### RemoveMemberDialog
**Fichier** : `src/components/circles/remove-member-dialog.tsx`
**Type** : Composé — Confirmation destructive
**Utilisation** : Dashboard membres — Retirer un participant

---

### DeleteCircleDialog
**Fichier** : `src/components/circles/delete-circle-dialog.tsx`
**Type** : Composé — Confirmation destructive
**Utilisation** : Dashboard communauté — Supprimer la communauté

---

### CircleShareInviteCard
**Fichier** : `src/components/circles/circle-share-invite-card.tsx`
**Type** : Composé — Partage

**Sections** : Lien d'invitation généré, bouton Copier, bouton Regénérer
**Utilisation** : Page communauté (organisateur) — Partager lien d'invitation

---

### DashboardModeSwitcher
**Fichier** : `src/components/dashboard/dashboard-mode-switcher.tsx`
**Type** : Composé — Toggle mode

**Modes** : PARTICIPANT (voir mes inscriptions), ORGANIZER (gérer mes communautés)
**Utilisation** : Dashboard header — Basculer entre les deux modes

---

### CreateCircleButton
**Fichier** : `src/components/dashboard/create-circle-button.tsx`
**Type** : Composé — CTA conditionnel
**Condition** : Visible uniquement si l'utilisateur a au moins un rôle HOST
**Utilisation** : Dashboard — Créer une nouvelle communauté

---

### CreateMomentButton
**Fichier** : `src/components/dashboard/create-moment-button.tsx`
**Type** : Composé — CTA
**Utilisation** : Dashboard — Créer un nouvel événement

---

### CreateMomentDropdown
**Fichier** : `src/components/dashboard/create-moment-dropdown.tsx`
**Type** : Composé — Menu contextuel
**Logique** : Si plusieurs communautés HOST, affiche un dropdown de sélection
**Utilisation** : Dashboard — Créer événement avec choix de la communauté

---

## 7. Listes & Données

### RegistrationsList
**Fichier** : `src/components/moments/registrations-list.tsx`
**Type** : Composé — Affichage participants

| Prop | Type | Valeurs |
|------|------|---------|
| `registrations` | RegistrationWithUser[] | — |
| `registeredCount` | number | — |
| `waitlistedCount` | number | — |
| `capacity` | number \| null | — |
| `variant` | string | `host` (email visible + export CSV), `public` (noms seulement) |

**Sections** :
- Badges compteurs (inscrits / liste d'attente / capacité)
- Liste : UserAvatar + nom (+ email si variant=host) + badge statut
- Bouton "Export CSV" (host uniquement)
- Pagination "Voir plus"

**Utilisation** : Page événement (section participants), Dashboard événement

---

### CircleMembersList
**Fichier** : `src/components/circles/circle-members-list.tsx`
**Type** : Composé — Affichage membres

| Prop | Type | Valeurs |
|------|------|---------|
| `hosts` | CircleMemberWithUser[] | Organisateurs (affichés en premier) |
| `players` | CircleMemberWithUser[] | Participants |
| `variant` | string | `host` (email visible + retirer membre), `player`, `member-view` |
| `circleId` | string | — |

**Sections** :
- Organisateurs (icône Crown) en premier
- Participants
- UserAvatar + nom (+ email si host) + badge rôle
- Bouton Retirer (host uniquement, sur participants)

**Utilisation** : Page communauté publique et dashboard membres

---

### MomentTimelineItem
**Fichier** : `src/components/circles/moment-timeline-item.tsx`
**Type** : Composé — Élément de timeline

**Sections** : Date (format court), Titre, Statut, Lieu
**Utilisation** : Page communauté — Chronologie des événements (upcoming / past)

---

### MomentsTabSelector
**Fichier** : `src/components/circles/moments-tab-selector.tsx`
**Type** : Composé — Onglets

**Onglets** : À venir, Passés
**Utilisation** : Page communauté — Basculer entre événements à venir et passés

---

### ExplorerGrid
**Fichier** : `src/components/explorer/explorer-grid.tsx`
**Type** : Composé — Grille avec pagination infinie

| Prop | Type | Valeurs |
|------|------|---------|
| `tab` | string | `circles`, `moments` |
| `initialItems` | PublicCircle[] \| PublicMoment[] | Données initiales (SSR) |
| `initialHasMore` | boolean | — |
| `registrationStatusMap` | Map | Statuts d'inscription par slug |
| `membershipBySlug` | Map | Rôles de membership par slug |

**Sections** : Grille de PublicCircleCard ou PublicMomentCard, bouton "Charger plus"
**Utilisation** : Page Découvrir — Grille principale avec chargement progressif

---

### ExplorerFilterBar
**Fichier** : `src/components/explorer/explorer-filter-bar.tsx`
**Type** : Composé — Barre de filtres

| Prop | Type | Valeurs |
|------|------|---------|
| `selectedCategory` | string \| undefined | Catégorie active |
| `sortBy` | string | `popular`, `recent` |
| `activeTab` | string | `circles`, `moments` |

**Filtres** : Catégories (pills), Tri (Populaire / Récent)
**Utilisation** : Page Découvrir — Filtres de recherche

---

### ExplorerFeatured
**Fichier** : `src/components/explorer/explorer-featured.tsx`
**Type** : Composé — Section mise en avant
**Utilisation** : Page Découvrir — Communautés mises en avant en haut de page

---

### ExplorerCreateButton
**Fichier** : `src/components/explorer/explorer-create-button.tsx`
**Type** : Composé — CTA conditionnel
**Condition** : Affiché si l'utilisateur n'a pas de communauté
**Utilisation** : Page Découvrir — Invitation à créer sa communauté

---

## 8. Commentaires & Contenu

### CommentThread
**Fichier** : `src/components/moments/comment-thread.tsx`
**Type** : Composé — Système de commentaires

| Prop | Type | Valeurs |
|------|------|---------|
| `momentId` | string | — |
| `comments` | CommentWithUser[] | — |
| `currentUserId` | string \| null | — |
| `isHost` | boolean | — |
| `isPastMoment` | boolean | Désactive l'ajout si passé |
| `signInUrl` | string | URL de connexion pour non-auth |

**Sections** :
- Formulaire ajout (Textarea + bouton Publier) — masqué si événement passé
- Liste commentaires : UserAvatar + nom + timestamp relatif + texte + bouton supprimer (auteur/host)

**Utilisation** : Page événement — Section commentaires

---

### CollapsibleDescription
**Fichier** : `src/components/moments/collapsible-description.tsx`
**Type** : Composé — Texte repliable

**Comportement** : Tronqué à 3 lignes par défaut, "Voir plus" / "Voir moins"
**Utilisation** : Page événement — Description longue

---

## 9. Vue Détail Événement

### MomentDetailView
**Fichier** : `src/components/moments/moment-detail-view.tsx`
**Type** : Composé — Page complète événement (variant pattern)

**Props communes** :
| Prop | Type |
|------|------|
| `moment` | Moment |
| `circle` | Circle |
| `hosts` | CircleMemberWithUser[] |
| `registrations` | RegistrationWithUser[] |
| `comments` | CommentWithUser[] |
| `currentUserId` | string \| null |

**Variant `host`** (dashboard organisateur) :
| Prop | Type |
|------|------|
| `variant` | "host" |
| `circleSlug` | string |
| `momentSlug` | string |
| `publicUrl` | string |

**Variant `public`** (page participante) :
| Prop | Type |
|------|------|
| `variant` | "public" |
| `isAuthenticated` | boolean |
| `isHost` | boolean |
| `existingRegistration` | Registration \| null |
| `isFull` | boolean |
| `upcomingCircleMoments` | Moment[] |

**Sections** (dans l'ordre de rendu) :
1. Image de couverture (carrée 1:1, gradient ou image) + DraftBadge overlay
2. Header : Titre, Date, Lieu, Lien vers la communauté, Avatar organisateur
3. Actions host (toolbar) : Modifier, Publier, Broadcast, Copier lien, Supprimer
4. RegistrationButton (variant public uniquement)
5. CollapsibleDescription
6. Métadonnées détail (lieu complet, capacité, date/heure)
7. RegistrationsList (participants + liste d'attente)
8. AddToCalendarButtons (après inscription)
9. Section "Prochains événements de la communauté"
10. CommentThread

**Utilisation** : Route `/m/[slug]` (public) et `/dashboard/circles/.../moments/[slug]` (host)

---

## 10. Profil & Paramètres

### ProfileForm
**Fichier** : `src/components/profile/profile-form.tsx`
**Type** : Composé — Formulaire profil

**Champs** :
- Nom (Input, modifiable)
- Email (Input, read-only)

**Utilisation** : Page `/dashboard/profile` — Éditer les informations du profil

---

### AvatarUpload
**Fichier** : `src/components/profile/avatar-upload.tsx`
**Type** : Composé — Upload photo de profil

| Prop | Type |
|------|------|
| `name` | string |
| `email` | string |
| `image` | string \| null |

**Fonctionnement** : Click sur avatar → sélection fichier → resize client-side (WebP, ~50Ko) → upload
**Validation** : JPEG, PNG, WebP, GIF — max 5Mo
**Utilisation** : Page profil — Changer l'avatar

---

### NotificationPreferencesForm
**Fichier** : `src/components/profile/notification-preferences-form.tsx`
**Type** : Composé — Préférences notifications

**Champs** : Switches pour chaque type de notification email
**Utilisation** : Page profil — Gérer les notifications

---

### DeleteAccountDialog
**Fichier** : `src/components/profile/delete-account-dialog.tsx`
**Type** : Composé — Confirmation destructive
**Utilisation** : Page profil — Supprimer le compte

---

### AdminHostModeToggle
**Fichier** : `src/components/profile/admin-host-mode-toggle.tsx`
**Type** : Composé — Toggles admin
**Utilisation** : Page profil (rôle ADMIN uniquement) — Basculer mode host

---

## 11. Navigation & Layout

### SiteHeader
**Fichier** : `src/components/site-header.tsx`
**Type** : Composé — Navigation principale (sticky)

**Sections** :
- Logo (lien vers `/dashboard` si auth, sinon `/`)
- Nav desktop (Découvrir, Mon espace) — visible si auth
- Actions droite : LocaleToggle (desktop), ThemeToggle (desktop), UserMenu ou bouton Sign in, MobileNav

**Breakpoints** : sm → MobileNav actif, md+ → nav desktop + toggles visibles
**Utilisation** : Layout global — `src/app/layout.tsx`

---

### SiteFooter
**Fichier** : `src/components/site-footer.tsx`
**Type** : Composé — Footer global

**Sections** :
- Logo + copyright "Powered by The Playground"
- Liens : À propos, Aide, Changelog, Mentions légales

**Utilisation** : Layout global

---

### MobileNav
**Fichier** : `src/components/mobile-nav.tsx`
**Type** : Composé — Menu hamburger mobile

| Prop | Type |
|------|------|
| `isAuthenticated` | boolean |
| `dashboardHref` | string |

**Contenu** : Découvrir, Mon espace, Sign in (conditionnel), ThemeToggle, LocaleToggle
**Utilisation** : SiteHeader — visible sur mobile

---

### UserMenu
**Fichier** : `src/components/user-menu.tsx`
**Type** : Composé — Menu dropdown utilisateur

| Prop | Type |
|------|------|
| `user.name` | string \| null |
| `user.email` | string |
| `user.image` | string \| null |
| `user.role` | UserRole (USER \| ADMIN) |

**Items** : Profil, Mon espace, Admin (conditionnel, si ADMIN), Déconnexion
**Utilisation** : SiteHeader — Avatar cliquable → menu

---

### ThemeToggle
**Fichier** : `src/components/theme-toggle.tsx`
**Type** : Composé — Contrôle thème

**Modes** : Light, Dark, Système
**Utilisation** : SiteHeader (desktop), MobileNav

---

### LocaleToggle
**Fichier** : `src/components/locale-toggle.tsx`
**Type** : Composé — Sélecteur langue

**Langues** : FR, EN
**Utilisation** : SiteHeader (desktop), MobileNav

---

## 12. Administration

### AdminSidebar
**Fichier** : `src/components/admin/admin-sidebar.tsx`
**Type** : Composé — Barre latérale navigation
**Sections** : Logo, liens navigation (Dashboard, Utilisateurs, Communautés, Événements, Explorer)
**Utilisation** : Layout `/admin/*` — navigation principale

---

### AdminMobileHeader
**Fichier** : `src/components/admin/admin-mobile-header.tsx`
**Type** : Composé — Header mobile admin
**Utilisation** : Layout admin — Navigation mobile

---

### AdminSearch
**Fichier** : `src/components/admin/admin-search.tsx`
**Type** : Composé — Champ de recherche
**Utilisation** : Tables admin — Filtrage par texte

---

### AdminPagination
**Fichier** : `src/components/admin/admin-pagination.tsx`
**Type** : Composé — Navigation pagination
**Utilisation** : Tables admin — Navigation entre pages

---

### AdminDeleteButton
**Fichier** : `src/components/admin/admin-delete-button.tsx`
**Type** : Composé — Action destructive
**Utilisation** : Tables admin — Supprimer un enregistrement

---

### StatsCard
**Fichier** : `src/components/admin/stats-card.tsx`
**Type** : Composé — Métrique

**Sections** : Icône, Label, Valeur, Tendance (delta %)
**Utilisation** : Admin dashboard — Affichage KPIs (utilisateurs, événements, inscriptions)

---

### ChartCard
**Fichier** : `src/components/admin/chart-card.tsx`
**Type** : Composé — Graphique
**Utilisation** : Admin dashboard — Visualisation données temporelles

---

### SparklineChart
**Fichier** : `src/components/admin/sparkline-chart.tsx`
**Type** : Composé — Mini graphique inline
**Utilisation** : Admin stats — Micro-visualisation tendance dans tableaux

---

### SortableTableHead
**Fichier** : `src/components/admin/sortable-table-head.tsx`
**Type** : Composé — En-tête de tableau triable
**Utilisation** : Tables admin — Colonnes avec tri ascendant/descendant

---

### PeriodSelector
**Fichier** : `src/components/admin/period-selector.tsx`
**Type** : Composé — Sélecteur période
**Valeurs** : 7j, 30j, 90j, 1an
**Utilisation** : Admin stats — Filtrer les données par période

---

### ExplorerControls / AdminExplorerTabs
**Fichiers** : `src/components/admin/explorer-controls.tsx`, `src/components/admin/admin-explorer-tabs.tsx`
**Type** : Composés — Contrôles explorer admin
**Utilisation** : Admin — Vue de l'Explorer avec contrôles (featured, catégorie, etc.)

---

## 13. Authentification

### SignInForm
**Fichier** : `src/components/auth/sign-in-form.tsx`
**Type** : Composé — Formulaire connexion

**Sections** :
- Onglets : Magic Link, Google OAuth, GitHub OAuth
- Champ email + bouton "Envoyer le lien"
- Boutons OAuth (Google, GitHub)

**Utilisation** : Page `/auth/sign-in`

---

## 14. Aide

### HelpSidebar
**Fichier** : `src/components/help/help-sidebar.tsx`
**Type** : Composé — Navigation aide
**Sections** : Liens vers les sections de la page d'aide
**Utilisation** : Page Aide — Navigation latérale sticky

---

### HelpFaqAccordion
**Fichier** : `src/components/help/help-faq-accordion.tsx`
**Type** : Composé — FAQ
**Utilisation** : Page Aide — Questions fréquentes en accordéon

---

### HelpContactForm
**Fichier** : `src/components/help/help-contact-form.tsx`
**Type** : Composé — Formulaire contact
**Champs** : Sujet, Message
**Utilisation** : Page Aide — Contacter le support

---

## 15. Providers & Utilitaires

### Providers
| Composant | Fichier | Rôle |
|-----------|---------|------|
| `SessionProvider` | `providers/session-provider.tsx` | Auth.js session context |
| `ThemeProvider` | `providers/theme-provider.tsx` | next-themes dark/light |
| `PosthogProvider` | `providers/posthog-provider.tsx` | Analytics context |
| `PosthogPageView` | `providers/posthog-pageview.tsx` | Suivi page views |
| `PosthogIdentity` | `providers/posthog-identity.tsx` | Identification utilisateur |

### Utilitaires
| Composant | Fichier | Rôle |
|-----------|---------|------|
| `PwaRedirect` | `pwa-redirect.tsx` | Détection et redirection PWA |
| `PwaInstallSection` | `pwa-install-section.tsx` | CTA installation PWA |
| `ScrollToTop` | `scroll-to-top.tsx` | Bouton retour haut de page |
| `MomentViewTracker` | `moments/moment-view-tracker.tsx` | Tracking vues événement |
| `CircleViewTracker` | `circles/circle-view-tracker.tsx` | Tracking vues communauté |
| `HostLink` | `circles/host-link.tsx` | Lien profil organisateur |

---

## 16. Composants par page

### Page Événement publique — `/m/[slug]`
`SiteHeader` · `SiteFooter` · `MomentDetailView (variant=public)` → `RegistrationButton` · `CollapsibleDescription` · `RegistrationsList (variant=public)` · `AddToCalendarButtons` · `CommentThread` · `PublicCircleCard` · `MomentViewTracker`

### Page Dashboard Événement (organisateur) — `/dashboard/circles/[slug]/moments/[slug]`
`SiteHeader` · `SiteFooter` · `MomentDetailView (variant=host)` → `PublishMomentButton` · `BroadcastMomentDialog` · `CopyLinkButton` · `DeleteMomentDialog` · `RegistrationsList (variant=host)` · `CommentThread`

### Page Communauté publique — `/circles/[slug]`
`SiteHeader` · `SiteFooter` · `CircleAvatar` · `JoinCircleButton` · `CircleMembersList` · `MomentsTabSelector` · `MomentTimelineItem` · `CircleViewTracker`

### Dashboard principal — `/dashboard`
`SiteHeader` · `SiteFooter` · `DashboardModeSwitcher` · `CreateCircleButton` · `CreateMomentButton/Dropdown` · `DashboardCircleCard` · `DashboardMomentCard`

### Page Découvrir — `/explorer`
`SiteHeader` · `SiteFooter` · `ExplorerFeatured` · `ExplorerFilterBar` · `ExplorerGrid` → `PublicCircleCard` ou `PublicMomentCard` · `ExplorerCreateButton`

### Formulaire Création/Édition Événement — `/dashboard/circles/[slug]/moments/new`
`SiteHeader` · `SiteFooter` · `MomentForm` → `MomentFormDateCard` · `MomentFormLocationRow` · `MomentFormOptionsSection` · `MomentFormRadar` · `CoverImagePicker` · `PublishMomentButton`

### Formulaire Création/Édition Communauté — `/dashboard/circles/new`
`SiteHeader` · `SiteFooter` · `CircleForm` → `CoverImagePicker`

### Page Profil — `/dashboard/profile`
`SiteHeader` · `SiteFooter` · `AvatarUpload` · `ProfileForm` · `NotificationPreferencesForm` · `DeleteAccountDialog`

### Page Invitation — `/circles/join/[token]`
`SiteHeader` · `SiteFooter` · `CircleAvatar` · `JoinCircleByInviteForm`

### Page Connexion — `/auth/sign-in`
`SignInForm`

### Page Aide — `/help`
`SiteHeader` · `SiteFooter` · `HelpSidebar` · `HelpFaqAccordion` · `HelpContactForm`

### Pages Admin — `/admin/*`
`AdminSidebar` · `AdminMobileHeader` · `AdminSearch` · `AdminPagination` · `AdminDeleteButton` · `StatsCard` · `ChartCard` · `SparklineChart` · `SortableTableHead` · `PeriodSelector`

---

## Récapitulatif statistiques

| Catégorie | Nombre |
|-----------|--------|
| Composants atomiques shadcn/ui | 21 |
| Avatars & Identité | 2 |
| Badges thématiques | 3 |
| Cartes (Cards) | 6 |
| Formulaires complexes | 7 |
| Actions & Interactions | 16 |
| Listes & Données | 7 |
| Commentaires & Contenu | 2 |
| Vue Détail | 1 |
| Profil & Paramètres | 5 |
| Navigation & Layout | 6 |
| Administration | 12 |
| Authentification | 1 |
| Aide | 3 |
| Providers & Utilitaires | 11 |
| **Total** | **103** |

---

## Notes pour l'export Figma

### Structure recommandée des pages Figma

1. **🎨 Foundations** — Couleurs (tokens), Typographie, Espacements, Ombres, Border-radius
2. **⚛️ Atoms** — Button, Badge, Input, Textarea, Label, Avatar, Switch, Skeleton, Separator
3. **🔧 Components** — Formulaires, Cartes, Listes, Navigation, Modales
4. **📄 Pages** — Frames des pages complètes avec composants assemblés
5. **📱 Mobile** — Variantes mobile des pages clés

### Priorités pour la recréation Figma

**Haute priorité** (pages virales et parcours principal) :
- Page Événement publique complète
- Page Communauté publique
- Page Découvrir (grille + filtres)
- Dashboard principal

**Moyenne priorité** (formulaires et profil) :
- Formulaire création événement
- Formulaire création communauté
- Page Profil

**Basse priorité** (admin) :
- Pages admin (usage interne)
