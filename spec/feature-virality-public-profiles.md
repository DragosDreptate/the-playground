# Spec — Viralité : Membres & Participants visibles + Profils utilisateurs

**Date :** 2026-03-10
**Statut :** Validé — prêt à implémenter
**Priorité :** Haute (levier de viralité / conversion)

---

## 1. Vision & Objectif

Augmenter la conversion en rendant visibles les membres d'une communauté à **tout utilisateur connecté**, et en permettant à tout utilisateur connecté de consulter le profil d'un autre utilisateur.

**Principe :** La preuve sociale (social proof) est le premier levier de conversion. Voir que des gens réels participent à une communauté ou à un événement incite à rejoindre. Aujourd'hui, la liste des membres n'est visible que dans le dashboard (membres seulement). C'est un frein à la conversion.

**Contrainte de confidentialité (membres uniquement) :** La liste des membres d'une communauté est réservée aux **utilisateurs connectés**. Un visiteur non connecté voit uniquement le compteur total, pas les noms. La liste des participants à un événement reste visible par tous (comportement actuel conservé).

**Objectif secondaire :** Permettre à tout utilisateur connecté de consulter le profil d'un autre utilisateur en cliquant sur son nom dans une liste. Le profil devient un hub de découverte : communautés + événements de la personne.

---

## 2. Périmètre

### 2.1 Ce que cette feature inclut

| # | Feature | Description |
| --- | --- | --- |
| F1 | **Membres visibles pour les connectés — page Communauté** | Afficher la liste des membres (nom + avatar) sur la page `/circles/[slug]`, visible uniquement pour les utilisateurs connectés |
| F2 | **Noms des participants cliquables — page Événement** | Sur `/m/[slug]`, la liste reste visible par tous (inchangé) — les noms deviennent des liens vers le profil pour les connectés uniquement |
| F3 | **Page profil utilisateur** | Nouvelle route `/u/[publicId]` accessible aux utilisateurs connectés uniquement |
| F4 | **Profil enrichi : Communautés** | La page profil affiche les communautés publiques dont l'utilisateur est membre |
| F5 | **Profil enrichi : Événements** | La page profil affiche les événements publics à venir auxquels l'utilisateur est inscrit |
| F6 | **Noms cliquables dans CircleMembersList** | Dans le dashboard Circle, les noms des membres redirigent vers `/u/[publicId]` |
| F7 | **Noms cliquables dans RegistrationsList** | Dans les pages événement (public + dashboard), les noms redirigent vers `/u/[publicId]` pour les connectés |
| F8 | **Lien "Voir mon profil" — Dashboard Profil** | Lien discret sous les stats sur `/dashboard/profile` → `/u/[publicId]` de l'utilisateur connecté |

### 2.2 Ce que cette feature n'inclut pas (hors scope)

- Messagerie privée entre utilisateurs
- Abonnement / suivi d'un utilisateur
- Fil d'actualité des utilisateurs
- Données privées visibles (email, téléphone, date d'inscription)
- Paramètres de confidentialité granulaires (scope Phase 2)
- Communautés privées dans le profil (filtrées — seules les communautés publiques sont visibles)

---

## 3. Règles métier

### 3.1 Visibilité des membres (F1)

- La liste des membres est visible **uniquement par les utilisateurs connectés** (connecté + non-membre = peut voir, non-connecté = ne voit pas)
- La liste des membres d'une communauté **privée** reste masquée pour les non-membres, même connectés
- Informations visibles dans la liste : **avatar (initiales/image) + nom complet**
- Informations masquées : email, date d'adhésion, rôle détaillé (sauf badge Organisateur)
- Badge "Organisateur" visible sur les Hosts
- Ordre d'affichage : Organisateurs d'abord, puis membres triés par date d'adhésion ascendante (les membres les plus anciens apparaissent en premier)
- Pagination : afficher les 10 premiers membres, bouton "Voir tous les membres" pour la liste complète
- Compteur total de membres visible par tous (connecté ou non) — comportement inchangé
- **Le compteur de membres est cliquable** pour les utilisateurs connectés → scroll/ancre vers la section membres
- Pour les visiteurs non connectés : compteur non cliquable + message "Connecte-toi pour voir les membres"

### 3.2 Visibilité des participants (F2)

- **La visibilité de la liste des participants est inchangée** : elle reste visible par tous sur `/m/[slug]`, connecté ou non — comportement actuel conservé
- **Nouveau :** les noms sont cliquables pour les utilisateurs connectés → redirigent vers `/u/[publicId]`
- Pour les visiteurs non connectés : noms affichés en texte simple, non cliquables
- Emails : jamais visibles publiquement (uniquement pour les Organisateurs — comportement inchangé)
- Bouton export CSV (`variant="host"`) : **strictement conservé**, inchangé

### 3.3 Page profil utilisateur (F3)

- Route : `/u/[publicId]` — ex. `/u/jean-dupont-4821`
- **Accessible uniquement aux utilisateurs connectés** — redirection vers `/auth/sign-in` si non connecté
- Si le `publicId` n'existe pas → 404
- Un utilisateur connecté peut voir son propre profil
- L'utilisateur qui visite son propre profil voit un bandeau "C'est votre profil · [Modifier mon profil →]"

### 3.4 Communautés sur le profil (F4)

- Seules les communautés **publiques** dont l'utilisateur est membre sont affichées
- Les communautés privées ne sont JAMAIS affichées sur le profil
- Informations affichées : nom de la communauté, cover/avatar, rôle (Organisateur / Participant)
- Tri : les communautés où l'utilisateur est **Organisateur** apparaissent en premier, puis celles où il est **Participant** — au sein de chaque groupe, tri alphabétique par nom de communauté
- Lien vers la page publique de la communauté (`/circles/[slug]`)

### 3.5 Événements sur le profil (F5)

- Seuls les événements **à venir** auxquels l'utilisateur est inscrit (statut REGISTERED) sont affichés
- Les événements passés ne sont pas affichés (peu de valeur virale)
- Les événements appartenant à des communautés **privées** ne sont pas affichés
- Informations affichées : titre, date, nom de la communauté
- Lien vers la page publique de l'événement (`/m/[slug]`)
- Si aucun événement à venir → section masquée ou état vide discret

### 3.6 Données personnelles & RGPD

- Nom complet visible pour les connectés → **l'utilisateur a consenti lors de l'inscription** (le nom est obligatoire à l'onboarding)
- Email **jamais** visible en dehors du contexte Organisateur
- Ajout d'une option "Masquer mon profil" dans les paramètres (Phase 2 — hors scope MVP)
- Avatar visible pour les connectés si uploadé

---

## 4. Décisions d'implémentation

### 4.1 Route de la page profil : `/u/[publicId]`

**Décision : slug généré automatiquement**
- Format : `prénom-nom` slugifié + nombre aléatoire à 4 chiffres → ex. `/u/jean-dupont-4821`
- ✅ URL lisible et quasi-mémorisable
- ✅ Généré automatiquement à la création du compte — aucune action utilisateur
- ✅ Le nombre aléatoire évite les collisions sans gestion complexe
- Champ `publicId` (string unique) ajouté au modèle `User` dans le schema Prisma
- Non éditable par l'utilisateur dans le MVP

### 4.1.1 Stratégie de migration — champ `publicId`

**Étape 1 — Migration Prisma :**
```prisma
model User {
  // ...
  publicId  String?  @unique  // nullable intentionnellement (backfill à venir)
}
```
Le champ est nullable pour ne pas bloquer les utilisateurs existants pendant la transition.

**Étape 2 — Backfill des utilisateurs existants :**
Script `pnpm db:backfill-public-id` (dev) / `pnpm db:backfill-public-id:prod` (prod) :
- Pour chaque `User` sans `publicId` : générer `slugify(firstName + "-" + lastName) + "-" + random(1000, 9999)`
- Vérifier l'unicité avant d'insérer — si collision, régénérer avec un nouveau nombre aléatoire (retry jusqu'à 10 fois)
- Fallback si `firstName` ou `lastName` est null/vide : `user-{random(10000, 99999)}`
- Script idempotent : ne re-génère pas si `publicId` déjà présent

**Étape 3 — Génération automatique pour les nouveaux utilisateurs :**
À la création d'un compte (callback `signIn` Auth.js ou usecase `CreateUser`) : générer et persister le `publicId` immédiatement.

**Gestion des routes pour les utilisateurs sans \****`publicId`**\*\* :**
- Edge case post-migration → la page `/u/[publicId]` retourne 404
- Le lien profil dans les listes n'est rendu que si `publicId` est non null

### 4.2 Gestion de l'accès restreint aux non-connectés

Sur la page **Communauté**, section membres :
- Connecté → fetch membres + affichage de la liste
- Non connecté → uniquement le compteur (non cliquable) + placeholder "Connecte-toi pour voir les membres"

Sur la page **Événement**, section participants :
- Comportement de visibilité inchangé (liste visible par tous)
- Connecté → noms = liens `/u/[publicId]`
- Non connecté → noms = texte simple non cliquable

**Implémentation :** guard au niveau du Server Component — la condition `session` est évaluée côté serveur, aucune donnée de membre n'est envoyée au client non connecté (Option A).

### 4.3 Évolution de `CircleMembersList`

Ajouter `variant="member-view"` au composant existant :
- Masque les emails, masque le bouton retrait
- Noms cliquables → `/u/[publicId]`
- Utilisé sur la page Circle publique (connecté non-membre ou membre)
- Les variants `"player"` et `"host"` existants reçoivent également les liens profil

---

## 5. Comportements UX détaillés

### 5.1 Page publique Communauté — section membres

**Visiteur non connecté :**
```
┌─────────────────────────────────────────────────────┐
│  Membres (42)  ← non cliquable                       │
│                                                      │
│  [🔒] Connecte-toi pour voir les membres            │
│                          [Se connecter →]           │
└─────────────────────────────────────────────────────┘
```

**Utilisateur connecté (non-membre ou membre) :**
```
┌─────────────────────────────────────────────────────┐
│  Membres (42)  ← cliquable, scroll vers la section   │
│                                                      │
│  [👑 JD] Jean Dupont · Organisateur  ← lien /u/…   │
│  [MF] Marie Fontaine · Organisateur  ← lien /u/…   │
│  [AL] Alice Leroy                    ← lien /u/…   │
│  [TB] Thomas Bernard                 ← lien /u/…   │
│  [  ] + 38 autres membres                           │
│                          [Voir tous les membres →]  │
└─────────────────────────────────────────────────────┘
```

### 5.2 Page publique Événement — section participants

**Visiteur non connecté :**
```
[AB] Alice B.    (texte non cliquable)
[CB] Charles B.  (texte non cliquable)
```

**Utilisateur connecté :**
```
[AB] Alice B.    → lien /u/jean-dupont-4821
[CB] Charles B.  → lien /u/charles-b-7392
```

Aucun autre changement — visibilité, badges, export CSV : inchangés.

### 5.3 Page profil `/u/[publicId]`

```
┌──────────────────────────────────────────────────────────┐
│  [bandeau si profil propre]                              │
│  C'est votre profil · [Modifier mon profil →]            │
├──────────────────────────────────────────────────────────┤
│   [Avatar]   Jean Dupont                                 │
│              /u/jean-dupont-4821                         │
│              Membre depuis mars 2025                     │
│              15 événements organisés  ← si ≥ 1 moment    │
├──────────────────────────────────────────────────────────┤
│  Communautés (3)                                         │
│                                                          │
│  [Cover] Tech Paris           Organisateur    →          │
│  [Cover] Yoga Montmartre      Participant     →          │
│  [Cover] Design Thinking FR   Participant     →          │
├──────────────────────────────────────────────────────────┤
│  Prochains événements (2)                                │
│                                                          │
│  Soirée JS & Pizza            Mar 15 · Tech Paris  →     │
│  Workshop React 19            Mar 22 · Tech Paris  →     │
└──────────────────────────────────────────────────────────┘
```

- Stat "événements organisés" : affichée uniquement si `hostedMomentsCount > 0` (ne pas afficher "0 événement organisé")

- Si aucune communauté publique → section masquée
- Si aucun événement à venir → section masquée

### 5.4 Dashboard Profil — lien "Voir mon profil" (F8)

Sous les stats `"3 communautés · 12 événements"` :
```
↗ Voir mon profil public    ← lien discret, texte primary, underline dotted
```
Redirige vers `/u/[publicId]` de l'utilisateur connecté.

---

## 6. Questions ouvertes — résolues

| Question | Décision |
| --- | --- |
| Événements passés sur le profil ? | Non — hors scope MVP |
| "Voir tous les membres" : pagination ou modal ? | Expand en place, load more |
| Communautés privées visibles dans le profil ? | Non — jamais |
| User peut masquer son profil ? | Phase 2 |
| Nombre d'événements organisés sur le profil d'un Organisateur ? | Oui, comme stat |
| Données de profil éditables depuis `/u/[publicId]` ? | Non — lien "Modifier mon profil" → dashboard |

---

## 7. Contraintes techniques

- **Performance** : fetch des membres conditionné à la session — aucune requête supplémentaire pour les non-connectés.
- **Sécurité** : les emails ne doivent jamais fuiter via les routes publiques ou semi-publiques.
- **SSR** : Server Components — la condition `session` est évaluée côté serveur. Aucune donnée de membre envoyée au client non connecté.
- **i18n** : toutes les nouvelles chaînes UI doivent être ajoutées en FR et EN.
- **Auth guard sur \****`/u/[publicId]`** : `auth()` dans le Server Component + redirect si non connecté.
- **Schema Prisma** : ajout du champ `publicId` → migration + backfill requis sur dev et prod.

---

## 8. Analyse complète des modifications par page

### 8.1 Page publique Communauté — `/circles/[slug]/page.tsx`

| Zone | Modification | Détail |
| --- | --- | --- |
| **Données chargées** | Conditionner le fetch des membres à la session | Connecté : fetch membres (nom, avatar, rôle). Non connecté : compteur seul (déjà chargé) |
| **Compteur membres** | Cliquable si connecté | Rendu comme `<a href="``#members``-section">` pour les connectés. Non cliquable (`<span>`) sinon |
| **Nouvelle section "Membres"** | Après la section événements, avec `id="members-section"` | Connecté : `CircleMembersList variant="member-view"` + noms → `/u/[publicId]`. Non connecté : placeholder |
| **Guard communauté privée** | Masquer même pour connecté non-membre | `isPrivate && !isMember` → ne pas afficher la liste |

**Fichiers à modifier :**
- `src/app/[locale]/(routes)/circles/[slug]/page.tsx`
- `src/components/circles/circle-members-list.tsx`
- `src/domain/ports/repositories/circle-repository.ts`
- `src/infrastructure/repositories/prisma-circle-repository.ts`

**Schema Prisma** : aucune modification.

---

### 8.2 Page publique Événement — `/m/[slug]/page.tsx`

| Zone | Modification | Détail |
| --- | --- | --- |
| **Noms dans RegistrationsList** | Cliquables si connecté | Connecté : lien `/u/[publicId]`. Non connecté : texte simple |
| **Visibilité de la liste** | **Inchangée** | Liste toujours visible par tous — comportement actuel conservé |
| **Export CSV, emails, badges** | **Inchangés** | Comportement host strictement conservé |

**Fichiers à modifier :**
- `src/app/[locale]/(routes)/m/[slug]/page.tsx` — passer `isAuthenticated` au composant
- `src/components/moments/registrations-list.tsx` — noms cliquables si `isConnected`

---

### 8.3 Page Découvrir — `/explorer/page.tsx`

**Optionnel pour le MVP** — prioriser F1, F2, F3.

---

### 8.4 Dashboard Circle — `circles/[slug]/page.tsx`

| Zone | Modification | Détail |
| --- | --- | --- |
| **CircleMembersList** | Noms cliquables | Chaque nom → `/u/[publicId]` |
| **Emails, bouton retrait** | Inchangés | Comportement host conservé |

**Fichiers à modifier :**
- `src/components/circles/circle-members-list.tsx`

---

### 8.5 Dashboard Moment — `moments/[momentSlug]/page.tsx` (vue host)

| Zone | Modification | Détail |
| --- | --- | --- |
| **RegistrationsList** | Noms cliquables | Liens `/u/[publicId]` — emails, export CSV, tous les comportements host **strictement conservés** |

---

### 8.6 Dashboard Profil — `/dashboard/profile/page.tsx`

| Zone | Modification | Détail |
| --- | --- | --- |
| **Lien "Voir mon profil"** | Ajouter sous les stats | Lien discret → `/u/[publicId]` de l'utilisateur connecté |

**Fichiers à modifier :**
- `src/app/[locale]/(routes)/dashboard/(app)/(main)/profile/page.tsx`

---

### 8.7 Nouvelle page — Profil utilisateur `/u/[publicId]/page.tsx`

**Structure :**
```
src/app/[locale]/(routes)/u/[publicId]/
  page.tsx      → Server Component (SSR), auth guard
  loading.tsx   → Skeleton
```

**Auth guard :**
```typescript
const session = await auth();
if (!session) redirect(`/${locale}/auth/sign-in`);
```

**Nouveau usecase :** `GetUserPublicProfile`
- Input : `publicId: string`
- Output : `{ user: PublicUser, publicCircles: PublicCircleMembership[], upcomingPublicMoments: PublicMomentRegistration[] }`
- Filtres : communautés publiques uniquement, événements à venir uniquement, aucune info privée

**Nouveau champ Prisma :**
```prisma
model User {
  // ...champs existants...
  publicId  String?  @unique  // ex: "jean-dupont-4821" — généré à la création, non éditable
}
```

**Types dans le domaine :**
```typescript
type PublicUser = {
  publicId: string;
  firstName: string;
  lastName: string;
  image: string | null;
  memberSince: Date;
  hostedMomentsCount: number;  // 0 si jamais organisé — affiché seulement si > 0
}

type PublicCircleMembership = {
  circleSlug: string;
  circleName: string;
  circleCover: string | null;
  role: "HOST" | "PLAYER";
}

type PublicMomentRegistration = {
  momentSlug: string;
  momentTitle: string;
  momentDate: Date;
  circleName: string;
}
```

**Flux du usecase ****`GetUserPublicProfile`**** :**
1. `UserRepository.getUserPublicProfile(publicId)` → résout le `userId` + données de base (`hostedMomentsCount` inclus)
2. Si `null` → retourner `null` (la page affichera un 404)
3. `CircleRepository.getPublicCirclesForUser(userId)` → communautés publiques
4. `MomentRepository.getUpcomingPublicMomentsForUser(userId)` → événements à venir publics
5. Assembler et retourner `{ user, publicCircles, upcomingPublicMoments }`

**Nouveaux ports :**
```typescript
// UserRepository
getUserPublicProfile(publicId: string): Promise<PublicUser | null>
// inclut hostedMomentsCount (count des Moments où l'user est HOST dans au moins un Circle)

// CircleRepository
getPublicCirclesForUser(userId: string): Promise<PublicCircleMembership[]>

// MomentRepository
getUpcomingPublicMomentsForUser(userId: string): Promise<PublicMomentRegistration[]>
```

---

### 8.8 Composant `CircleMembersList` — évolution

| Prop | Actuel | Nouveau |
| --- | --- | --- |
| `variant` | `"player"` ou `"host"` | Ajouter `"member-view"` |
| `variant="member-view"` | — | Masque emails + bouton retrait, noms → `/u/[publicId]` |
| `variant="player"` | Noms non cliquables | Noms → `/u/[publicId]` |
| `variant="host"` | Noms non cliquables | Noms → `/u/[publicId]`, emails + retrait inchangés |

---

### 8.9 Composant `RegistrationsList` — évolution

| Zone | Actuel | Nouveau |
| --- | --- | --- |
| Noms (`variant="public"`) | Texte statique | Lien `/u/[publicId]` si `isConnected`, texte sinon |
| Noms (`variant="host"`) | Texte statique | Lien `/u/[publicId]` — emails et export CSV **inchangés** |
| Bouton export CSV (`variant="host"`) | Présent | **Conservé sans modification** |
| Emails (`variant="host"`) | Visibles | **Conservés sans modification** |

---

## 9. Nouvelles routes

| Route | Type | Accès |
| --- | --- | --- |
| `/u/[publicId]` | Semi-publique | Utilisateurs connectés uniquement — redirect sign-in sinon |

Exemple : `/u/jean-dupont-4821`

---

## 10. Nouveaux usecases & ports

| Usecase | Port / méthode | Description |
| --- | --- | --- |
| `GetUserPublicProfile` | `UserRepository.getUserPublicProfile(publicId)` | Lookup par `publicId`, retourne données non-privées |
| — | `CircleRepository.getPublicCirclesForUser(userId)` | Communautés publiques de l'utilisateur |
| — | `MomentRepository.getUpcomingPublicMomentsForUser(userId)` | Événements publics à venir de l'utilisateur |

**Note schema :** migration Prisma (`publicId` nullable) + script backfill `pnpm db:backfill-public-id` sur dev et prod.

---

## 11. Nouvelles chaînes i18n

| Clé | FR | EN |
| --- | --- | --- |
| `Profile.memberSince` | `Membre depuis {date}` | `Member since {date}` |
| `Profile.communities` | `Communautés ({count})` | `Communities ({count})` |
| `Profile.upcomingEvents` | `Prochains événements ({count})` | `Upcoming events ({count})` |
| `Profile.noUpcomingEvents` | `Aucun événement à venir` | `No upcoming events` |
| `Profile.noCommunities` | `Aucune communauté publique` | `No public community` |
| `Profile.editMyProfile` | `Modifier mon profil` | `Edit my profile` |
| `Profile.viewMyProfile` | `Voir mon profil public` | `View my public profile` |
| `Profile.itsYourProfile` | `C'est votre profil` | `This is your profile` |
| `Profile.hostedEvents` | `{count} événement organisé` / `{count} événements organisés` | `{count} event organized` / `{count} events organized` |
| `Circle.membersSection` | `Membres ({count})` | `Members ({count})` |
| `Circle.seeAllMembers` | `Voir tous les membres` | `See all members` |
| `Circle.loginToSeeMembers` | `Connecte-toi pour voir les membres` | `Sign in to see members` |

---

## 12. Ordre d'implémentation recommandé

| Priorité | Feature | Complexité | Impact |
| --- | --- | --- | --- |
| 1 | F3 + F4 + F5 — Page profil `/u/[publicId]` + contenu enrichi | Moyenne | Fondation requise pour toutes les autres |
| 2 | F2 — Noms cliquables sur page Événement | Faible | Quick win, page à fort trafic |
| 3 | F1 — Membres sur page Communauté (connectés uniquement) | Moyenne | Fort impact viral |
| 4 | F6 + F7 — Noms cliquables dans dashboard (Circle + Moment) | Faible | Cohérence UX |
| 5 | F8 — Lien "Voir mon profil" sur dashboard profil | Très faible | Confort utilisateur |

---

## 13. Tests requis

### Tests unitaires (Vitest)

- `GetUserPublicProfile` usecase :
  - Given user exists with public circles → returns correct profile
  - Given user exists but all circles are private → returns empty circles array
  - Given user has upcoming events in private circles → filters them out
  - Given publicId doesn't exist → returns null
  - Never returns email in profile data
  - Given user has hosted moments → hostedMomentsCount reflects exact count
  - Given user has never hosted → hostedMomentsCount is 0

### Tests E2E (Playwright)

**Membres (F1) :**
- Un utilisateur connecté (non-membre) peut voir la liste des membres d'une communauté publique
- Le compteur de membres est cliquable pour un utilisateur connecté → scroll vers la section membres
- Le compteur de membres n'est pas cliquable pour un visiteur non connecté
- Un visiteur non connecté voit le placeholder "Connecte-toi pour voir les membres"

**Participants (F2) :**
- Un visiteur non connecté voit la liste des participants en texte non cliquable
- Un utilisateur connecté voit les noms des participants comme des liens cliquables

**Profil (F3, F4, F5) :**
- Un utilisateur connecté peut cliquer sur un membre et accéder à sa page profil
- La page profil affiche les communautés publiques et les événements à venir
- Un utilisateur non connecté accédant à `/u/[publicId]` est redirigé vers sign-in
- Un utilisateur connecté voit le bandeau "C'est votre profil" sur son propre profil

**Dashboard profil (F8) :**
- Un utilisateur connecté voit le lien "Voir mon profil public" sous ses stats sur `/dashboard/profile`
- Le lien pointe vers `/u/[publicId]` de l'utilisateur connecté

**Sécurité :**
- Les emails ne sont jamais visibles en dehors du contexte Organisateur
- Une communauté privée ne montre pas ses membres à un utilisateur connecté non-membre

---

*Spec créée le 2026-03-10 — validée, prête à implémenter.*
