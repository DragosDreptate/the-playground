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
- Événements appartenant à ces mêmes communautés

Ces entités n'apparaissent jamais sur Explorer, quel que soit leur score.

> Les communautés `@demo.playground` ne sont **pas** exclues — elles apparaissent mélangées dans la liste avec un badge "Démo" et un score capé à 50. Voir section dédiée ci-dessous.

---

## Communautés et événements démo (`@demo.playground`)

Les communautés démo ne sont pas exclues — elles apparaissent sur Explorer mais avec un traitement spécifique :

### Champ DB

```prisma
model Circle {
  isDemo  Boolean  @default(false)
}
```

Les communautés seedées avec `@demo.playground` ont `isDemo: true`.

### Comportement

- **Score capé à 50/100** → score calculé normalement puis plafonné à 50, quel que soit le résultat brut. Les vraies communautés actives (score > 50) passent naturellement devant. Les démos restent visibles et mélangées avec les vraies communautés peu actives.
- **Badge "Démo"** affiché sur les cards Explorer — Communautés ET événements appartenant à un Circle `isDemo: true`
- **Exclues du pool "À la une"** automatiquement

```
score_circle = isDemo
  ? Math.min(Math.round((raw_score / 205) * 100), 50)   // capé à 50
  : Math.round((raw_score / 205) * 100)                  // normal
```

### Rationale

- Les démos sont parfaitement seedées (cover, membres, events) → score brut ~90/100 sans cap. Elles domineraient Explorer sans plafonnement.
- Cap à 50 : mélangées au milieu, jamais en tête. Descendent progressivement quand le vrai catalogue grossit — sans action manuelle.
- Badge "Démo" : transparence maintenue pour les visiteurs.
- Cap tuneable : valeur initiale conservative, à ajuster selon la densité du catalogue.

---

## Score Communauté (Circle)

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
| --- | --- | --- |
| Événement passé avec ≥ 1 inscrit | **+20** | Preuve d'existence réelle |
| Cover image | **+18** | `coverImageUrl != null` |
| Prochain événement publié | **+15** | status `PUBLISHED` + `startsAt > now` |
| Description ≥ 30 caractères | **+10** | `description.trim().length >= 30` |
| Catégorie renseignée | **+7** | `category != null` |
| Ancienneté > 1 jour | **+5** | `createdAt < now - 24h` |

#### Signaux quantitatifs (max 130 pts — 63%)

| Signal | Formule | Cap | Plafond atteint à |
| --- | --- | --- | --- |
| Membres (hors host) | `n × 8` | **80 pts** | ≥ 10 membres |
| Événements passés | `n × 10` | **50 pts** | ≥ 5 événements passés |

#### Cas concrets

| Profil | Score brut | Score /100 |
| --- | --- | --- |
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
| --- | --- | --- | --- |
| Nombre d'inscrits | `n × 7` | **70 pts** | ≥ 10 inscrits |
| Cover image | **+15** | — | — |
| Description ≥ 30 caractères | **+10** | — | — |
| Lieu renseigné | **+5** | — | — |

#### Règle d'exclusion

Événements dont le host a un email `@test.playground` : exclus via filtre `WHERE`.
Événements d'un Circle `isDemo: true` : affichés avec badge "Démo", score capé à 50.

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

Les communautés `excludedFromExplorer: true` et `isDemo: true` sont exclues du pool.

### Mécanique

```
pool = communautés PUBLIC
       avec coverImageUrl != null
       ET excludedFromExplorer = false
       ET isDemo = false
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

**1. Liste Explorer (****`/admin/explorer`****)**
- Tableau des Communautés publiques avec leur score calculé en temps réel
- Colonne `overrideScore` (éditable inline)
- Toggle `excludedFromExplorer` (bouton on/off)
- Filtre rapide : "Exclues" / "Boostées" / "Toutes"

**2. Détail Communauté (****`/admin/circles/[id]`****)**
- Section "Visibilité Explorer" dans le panneau admin existant
- Champ `overrideScore` (input 0–100, vide = automatique)
- Toggle exclusion avec confirmation
- Score calculé affiché en lecture seule à côté (pour référence)

---

## Architecture technique

### Stratégie : batch quotidien

Le score est **persisté en DB** et recalculé chaque nuit. La requête Explorer se réduit à un `ORDER BY explorer_score DESC` sur index — aucune agrégation à la volée.

**Fréquence** : 1x/jour à **3h00** (heure creuse).
**Décalage acceptable** : max 24h — une communauté qui gagne des membres peut attendre le lendemain.

### Champs DB

```prisma
model Circle {
  explorerScore   Int       @default(0)  // 0–100, recalculé chaque nuit
  scoreUpdatedAt  DateTime?              // timestamp du dernier calcul (debug/admin)
  // + champs déjà spécifiés : isDemo, excludedFromExplorer, overrideScore
}

model Moment {
  explorerScore   Int       @default(0)  // 0–100, recalculé chaque nuit
}
```

### Vercel Cron Job

```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/recalculate-scores",
    "schedule": "0 3 * * *"
  }]
}
```

Route protégée par header `Authorization: Bearer CRON_SECRET` (injecté automatiquement par Vercel).

### Séquence d'exécution du job

```
1. Charger toutes les Circles PUBLIC non exclues
   (avec agrégats : memberCount, pastEventCount, hasCover, etc.)

2. Pour chaque Circle :
   a. Calculer raw_score
   b. Normaliser → score 0–100
   c. Si isDemo → Math.min(score, 50)
   d. Si overrideScore != null → utiliser overrideScore directement
   e. Écrire explorerScore + scoreUpdatedAt

3. Charger tous les Moments PUBLISHED à venir (circle PUBLIC, non exclu)
   (avec agrégats : registrantCount, hasCover, hasLocation, etc.)

4. Pour chaque Moment :
   a. Récupérer explorerScore du Circle parent (déjà calculé à l'étape 2)
   b. Calculer moment_raw
   c. score_moment = round(score_circle * 0.5 + moment_raw * 0.5)
   d. Si circle.isDemo → Math.min(score_moment, 50)
   e. Écrire explorerScore

5. Logger : nb circles mis à jour, nb moments mis à jour, durée
```

### Ce qui reste temps réel

La section **"À la une"** : random seedé par date sur une petite pool (`WHERE coverImageUrl != null AND isDemo = false AND excludedFromExplorer = false`). Calculé à la requête, aucune agrégation lourde — quelques ms.

### Évolutivité

Passer à 2x/jour ou 4x/jour si nécessaire : modifier uniquement le `schedule` cron, aucun changement d'architecture.

---

## Décisions prises

| Date | Décision |
| --- | --- |
| 2026-03-13 | Score interne non exposé aux utilisateurs — invisible, uniquement pour le tri |
| 2026-03-13 | Exclusion absolue : @test.playground uniquement — jamais affichés sur Explorer |
| 2026-03-13 | Score Communauté et score Événement découplés (dans une certaine mesure) |
| 2026-03-13 | Cover image = signal fort (visibilité des communautés qui rendent bien) |
| 2026-03-13 | Description = signal fort avec seuil minimum de longueur (filtre les descriptions "test") |
| 2026-03-13 | Seuil description : 30 caractères |
| 2026-03-13 | Seuil ancienneté : 1 jour (filtre les comptes du jour uniquement) |
| 2026-03-13 | Score normalisé 0–100 : `Math.round((raw_score / 205) * 100)` |
| 2026-03-13 | Binaire = 37% du score max, quantitatif = 63% — les métriques d'activité dominent |
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
| 2026-03-13 | Communautés @demo.playground : `isDemo: true`, score capé à 50/100, badge "Démo" sur cards Communauté ET Événement |
| 2026-03-13 | Cap démo ajusté à 50 — les vraies communautés actives (score > 50) passent devant |
| 2026-03-13 | Démos mélangées dans la liste (pas reléguées en fin) — donnent de la consistance à Explorer pendant le lancement |
| 2026-03-13 | Architecture : batch quotidien à 3h00 via Vercel Cron — score persisté en DB, requête Explorer = ORDER BY index |
| 2026-03-13 | Champs DB : `explorerScore Int` + `scoreUpdatedAt DateTime?` sur Circle, `explorerScore Int` sur Moment |
| 2026-03-13 | Section "À la une" reste temps réel (random sur petite pool, aucune agrégation) |
