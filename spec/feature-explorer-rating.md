# Explorer — Score de pertinence (Rating interne)

> Spec vivante — construite progressivement en sessions de travail collaboratives.
> Référence : `spec/feature-explorer-la-carte.md` (spec Explorer existante)
>
> **Contexte** : en phase de lancement, de nombreux comptes test et communautés vides
> polluent la page Explorer. L'ordre chronologique ne suffit plus. Ce score interne
> (non exposé aux utilisateurs) permet de mettre en avant les vraies communautés actives.

---

## Principe

Le **score de pertinence** est un entier calculé pour chaque Communauté et chaque événement.
Il est **invisible pour les utilisateurs** — pas de badge, pas de classement affiché.
Il sert uniquement à trier les résultats sur Explorer.

**Ce que ce n'est pas** :
- Un système de like ou de vote
- Un ranking compétitif entre organisateurs
- Un mécanisme de mise en avant payante
- Un algorithme de recommandation personnalisée

**Invariant** : le score est décorrélé de la date de création.
Une communauté récente mais active peut dépasser une communauté ancienne mais vide.

---

## Règle d'exclusion absolue

Avant tout calcul de score, les entités suivantes sont **exclues de l'affichage** :

- Communautés dont le Host a un email `@test.playground`
- Communautés dont le Host a un email `@demo.playground`
- Événements appartenant à ces mêmes communautés

Ces entités n'apparaissent jamais sur Explorer, quel que soit leur score.

---

## Score Communauté (Circle)

> Session 1 — signaux en cours de définition

### Tableau des signaux

| Signal | Poids | Type | Logique |
|---|---|---|---|
| Cover image renseignée | **Fort** | Binaire | Communauté qui rend bien visuellement — investissement de l'organisateur |
| Description ≥ seuil min | **Fort** | Binaire | La description est obligatoire donc elle existe, le seuil filtre les "test" / "essai" / une ligne |
| Événement passé avec ≥ 1 inscrit | **Fort** | Binaire | Preuve que la communauté a réellement eu lieu — le signal le plus fort |
| Prochain événement publié (upcoming) | **Fort** | Binaire | Communauté vivante, pas abandonnée après création |
| Nombre de membres réels (hors host) | **Fort** | Quantitatif | Une communauté de test reste souvent à 0 membres |
| Nombre d'événements passés | **Moyen** | Quantitatif | Historique d'activité — différencie une communauté établie d'une nouvelle |
| Ancienneté > N jours | **Moyen** | Binaire | Filtre les comptes créés aujourd'hui — seuil à définir (7 jours ?) |
| Catégorie renseignée | **Faible** | Binaire | Signe de soin — les tests sautent souvent ce champ |
| Ville renseignée | **Faible** | Binaire | Idem |

> **Questions ouvertes** :
> - Seuil description : combien de caractères ? (proposition : 150 chars)
> - Seuil ancienneté : 7 jours ? 14 jours ?
> - Plafonnement des signaux quantitatifs (membres, événements passés) ? ex: log(n) pour éviter qu'une grosse communauté écrase tout

### Seuil d'affichage sur Explorer

Une communauté n'apparaît sur Explorer que si elle remplit **au moins une** des conditions :
- ≥ 1 membre réel (hors host)
- ≥ 1 événement publié à venir

Les coquilles vides (aucun membre, aucun événement) sont exclues via filtre `WHERE`, pas via score.

### Formule

Score brut max : **205 pts**. Score final normalisé entre 0 et 100.

```
raw_score =
  (hasPastEventWithRegistrant ? 20 : 0) +
  (hasCover ? 18 : 0) +
  (hasUpcomingEvent ? 15 : 0) +
  (description.trim().length >= 30 ? 10 : 0) +
  (hasCategory ? 7 : 0) +
  (ageInDays >= 1 ? 5 : 0) +
  Math.min(memberCount * 8, 80) +
  Math.min(pastEventCount * 10, 50)

score_circle = Math.round((raw_score / 205) * 100)   // normalisé 0–100
```

#### Signaux binaires (max 75 pts — 37%)

| Signal | Pts | Condition |
|---|---|---|
| Événement passé avec ≥ 1 inscrit | **+20** | Preuve d'existence réelle |
| Cover image | **+18** | `coverImageUrl != null` |
| Prochain événement publié | **+15** | status `PUBLISHED` + `startsAt > now` |
| Description ≥ 30 caractères | **+10** | `description.trim().length >= 30` |
| Catégorie renseignée | **+7** | `category != null` |
| Ancienneté > 1 jour | **+5** | `createdAt < now - 24h` |

#### Signaux quantitatifs (max 130 pts — 63%)

| Signal | Formule | Cap | Plafond atteint à |
|---|---|---|---|
| Membres (hors host) | `n × 8` | **80 pts** | ≥ 10 membres |
| Événements passés | `n × 10` | **50 pts** | ≥ 5 événements passés |

#### Cas concrets

| Profil | Score brut | Score /100 |
|---|---|---|
| Coquille vide (0 membres, 0 events) | — | **non affichée** |
| Nouvelle communauté soignée, 0 membres, 1 event à venir | 55 | **27** |
| Communauté avec 3 membres, cover, 1 event passé, 1 à venir | 99 | **48** |
| Communauté établie, 10 membres, 5 events passés, tout coché | 205 | **100** |

---

## Score Événement (Moment)

### Principe de couplage

Le score Moment est composé à **50% du score de sa Communauté parente** et à **50% de signaux propres à l'événement**.

Un événement dans une communauté de qualité (score 80) part à 40/100 avant même d'évaluer l'événement. Un événement dans une communauté test (score 10) part à 5/100 — très difficile de remonter.

### Formule

```
moment_raw = min(registrantCount * 7, 70)
           + (hasCover ? 15 : 0)
           + (description.trim().length >= 30 ? 10 : 0)
           + (hasLocation ? 5 : 0)

score_moment = Math.round(score_circle * 0.5 + moment_raw * 0.5)  // normalisé 0–100
```

#### Signaux propres à l'événement (raw max 100 pts → contribue 0–50 pts au score final)

| Signal | Formule / Pts | Cap | Plafond atteint à |
|---|---|---|---|
| Nombre d'inscrits | `n × 7` | **70 pts** | ≥ 10 inscrits |
| Cover image | **+15** | — | — |
| Description ≥ 30 caractères | **+10** | — | — |
| Lieu renseigné | **+5** | — | — |

#### Règle d'exclusion

Même règle que pour les Communautés : événements dont le host a un email `@test.playground` ou `@demo.playground` exclus via filtre `WHERE`.

---

## Couplage Circle ↔ Moment

50% Circle / 50% Moment-spécifique — voir section Score Événement.

---

## Section "À la une" sur Explorer

### Principe

3 communautés sélectionnées **aléatoirement chaque jour** parmi l'ensemble des communautés éligibles.

Le random est le mécanisme d'équité : toute communauté éligible a une chance égale d'apparaître. Pas de curation manuelle, pas de favoritisme.

### Condition d'éligibilité

Une seule condition : **avoir une cover image** (`coverImageUrl != null`).

Rationale : la cover garantit que les 3 cards rendent visuellement bien. C'est aussi un signal d'effort minimal de l'organisateur. La condition est simple, compréhensible, et constitue un pool large dès le lancement.

Les communautés `excludedFromExplorer: true` sont exclues du pool.

### Mécanique

```
pool = communautés PUBLIC avec coverImageUrl != null ET excludedFromExplorer = false
sélection = 3 éléments tirés aléatoirement, seed = date du jour (YYYY-MM-DD)
```

Le seed par date garantit que tous les visiteurs voient les mêmes 3 communautés dans la journée. La sélection change à minuit.

### Fallback

Si `pool.length < 3` → afficher les top N disponibles par score (sans compléter à 3 avec des communautés sans cover).

### Communication

Libellé sous la section : *"Sélectionnées parmi les communautés actives"* — transparent sur le mécanisme, sans détailler l'algorithme.

---

## Override admin

### Champs DB (sur `Circle` uniquement)

```prisma
model Circle {
  excludedFromExplorer  Boolean  @default(false)
  overrideScore         Int?     // null = score calculé automatiquement | 0–100 = score forcé
}
```

- `excludedFromExplorer: true` → Communauté ET ses événements exclus d'Explorer via filtre `WHERE`
- `overrideScore: 90` → score forcé à 90, le calcul automatique est ignoré
- `overrideScore: null` → comportement par défaut, score calculé

Pas de champ override sur `Moment` — l'exclusion du Circle cascade naturellement à ses événements.

### Interface admin

Géré exclusivement depuis le backend admin (`/admin/*`), pas accessible aux organisateurs.

Deux écrans dédiés :

**1. Liste Explorer (`/admin/explorer`)**
- Tableau des Communautés publiques avec leur score calculé en temps réel
- Colonne `overrideScore` (éditable inline)
- Toggle `excludedFromExplorer` (bouton on/off)
- Filtre rapide : "Exclues" / "Boostées" / "Toutes"

**2. Détail Communauté (`/admin/circles/[id]`)**
- Section "Visibilité Explorer" dans le panneau admin existant
- Champ `overrideScore` (input 0–100, vide = automatique)
- Toggle exclusion avec confirmation
- Score calculé affiché en lecture seule à côté (pour référence)

---

## Architecture technique

> À définir après la finalisation de la formule

---

## Décisions prises

| Date | Décision |
|---|---|
| 2026-03-13 | Score interne non exposé aux utilisateurs — invisible, uniquement pour le tri |
| 2026-03-13 | Exclusion absolue des emails @test.playground et @demo.playground |
| 2026-03-13 | Score Communauté et score Événement découplés (dans une certaine mesure) |
| 2026-03-13 | Cover image = signal fort (visibilité des communautés qui rendent bien) |
| 2026-03-13 | Description = signal fort avec seuil minimum de longueur (filtre les descriptions "test") |
| 2026-03-13 | Seuil description : 30 caractères |
| 2026-03-13 | Seuil ancienneté : 1 jour (filtre les comptes du jour uniquement) |
| 2026-03-13 | Score normalisé 0–100 : `Math.round((raw_score / 200) * 100)` |
| 2026-03-13 | Binaire = 65% du score max (plancher qualité), quantitatif = 35% (différenciateur entre vraies communautés) |
| 2026-03-13 | Quantitatif : plafond linéaire `min(n × coeff, cap)` — simple à raisonner, évite la dominance des très grandes communautés |
| 2026-03-13 | Ville supprimée des signaux — non pertinente comme signal de qualité |
| 2026-03-13 | Catégorie : signal faible → moyen (+7 pts) |
| 2026-03-13 | Proportion inversée : quantitatif 63% / binaire 37% — les métriques d'activité dominent |
| 2026-03-13 | Communauté sans membre ET sans event à venir → exclue d'Explorer via filtre WHERE (pas score = 0) |
| 2026-03-13 | Score Moment = 50% score Circle + 50% signaux Moment-spécifiques |
| 2026-03-13 | Taux de remplissage éliminé des signaux Moment (trop complexe, cas limite capacité indéfinie) |
| 2026-03-13 | Plafond inscrits : 10 inscrits = score max sur ce critère (`n × 7`, cap 70) |
| 2026-03-13 | Section "À la une" : 3 communautés random par jour, seed = date, condition = cover image uniquement |
| 2026-03-13 | Seuil "à la une" volontairement bas (cover only) pour garantir un pool large au lancement |
| 2026-03-13 | Override admin : `excludedFromExplorer` (boolean) + `overrideScore` (Int?) sur Circle uniquement |
| 2026-03-13 | Override géré exclusivement depuis le backend admin (/admin/*) — deux écrans : liste Explorer + détail Circle |
