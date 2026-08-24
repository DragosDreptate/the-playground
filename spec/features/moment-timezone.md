# Fuseaux horaires des événements

> **Décision** : [ADR-0008](../decisions/0008-fuseau-horaire-affichage-visiteur.md) — affichage web dans le fuseau du visiteur, fuseau de l'événement stocké pour les surfaces serveur.
> **Issue** : #475. **Statut** : **toutes les étapes livrées**. Migration production et backfill appliqués le 24/08/2026 (snapshot Neon `pre-push-20260824-092021`). Reste la PR et le déploiement, tous deux à décider explicitement.

## Comportement cible

| Surface | Fuseau appliqué | Mention du fuseau |
|---|---|---|
| Page événement, timeline, cartes, Explorer, widget embed | **visiteur** | non |
| Formulaire de création / édition | **fuseau de l'événement** (capté du navigateur à la création, jamais réécrit) | oui (badge sous les créneaux) |
| Emails (confirmation, rappel 24h, message Organisateur) | **événement** | oui |
| Notification Slack admin | **événement** | oui |
| Image OpenGraph (`opengraph-image.tsx`) | **événement** | oui |
| Export ICS / Google Calendar | UTC (inchangé) | — (l'agenda convertit) |

Règle de partage : toute surface **rendue côté serveur sans visiteur identifiable** (email, notification, image) utilise le fuseau de l'événement et l'affiche. Toute surface **lue dans un navigateur** utilise le fuseau de ce navigateur, sans mention.

## Ce qui ne change pas

Point important pour cadrer le risque : **la persistance et toute la logique métier restent intactes.**

- Les instants restent stockés en UTC (`DateTime` Prisma). Aucune donnée existante n'est fausse.
- Le passage automatique à `PAST` (cron `transition-past-moments`), la fenêtre glissante des rappels 24h, le filtrage « à venir / passés », la validation « date dans le passé » (`MomentPastDateError`) comparent tous des **instants UTC** : aucun impact fuseau.
- L'export ICS (`calendar.ts:14`) est déjà correct.

Le chantier est donc cantonné à **la saisie et l'affichage**.

## 1. Modèle de données

Nouveau champ sur `Moment` :

```prisma
timezone String @default("Europe/Paris")
```

Identifiant IANA (`Europe/Dublin`, `America/New_York`). Le défaut sert au backfill et aux créations hors UI ; l'UI le renseigne toujours explicitement.

Répercuter sur : entité `domain/models/moment.ts`, port `moment-repository.ts`, `PrismaMomentRepository` (mapping), usecases `create-moment` / `update-moment`, schémas de validation des server actions.

**Migration** : `pnpm db:push` (dev) **puis** `pnpm db:push:prod`. Voir la section Backfill ci-dessous — le défaut ne suffit pas.

## 2. Saisie (formulaire)

Aujourd'hui `combineDateAndTime` (`src/lib/time-options.ts`) construit l'instant via `setHours()`, donc **dans le fuseau du navigateur**. À remplacer par une conversion explicite depuis le fuseau choisi.

`date-fns-tz@3.2.0` est **déjà installé** — pas de nouvelle dépendance :

- `fromZonedTime(date, timezone)` : heure locale dans le fuseau de l'événement → instant UTC (saisie).
- `toZonedTime(date, timezone)` : instant UTC → heure locale du fuseau (pré-remplissage à l'édition).

Trois fonctions à faire évoluer, toutes dans `time-options.ts` :

| Fonction | Aujourd'hui | Cible |
|---|---|---|
| `combineDateAndTime` | `setHours` (navigateur) | `fromZonedTime` avec le fuseau de l'événement |
| `extractTime` | `getHours` (navigateur) | `toZonedTime` puis extraction |
| `isStartToday` / filtrage des créneaux passés | `new Date()` local | « aujourd'hui » dans le fuseau de l'événement |

⚠️ **`extractTime` est le piège le plus coûteux** : à l'édition, un organisateur qui ouvre le formulaire depuis un autre fuseau que celui de l'événement verrait aujourd'hui une heure décalée pré-remplie — et la ré-enregistrerait décalée. Corriger la saisie sans corriger l'extraction transforme un bug d'affichage en **corruption de données**.

### UI — aucun sélecteur

Décision produit (ADR-0008) : **pas de champ de fuseau dans le formulaire.** Le fuseau du navigateur est le bon dans la quasi-totalité des cas, et un champ de plus irait contre le minimalisme du formulaire de création.

Le fuseau est donc capté silencieusement, **à la création uniquement**. Le badge existant sous les créneaux continue d'afficher le fuseau retenu, mais il affiche désormais celui de l'**événement** et non celui du navigateur : en éditant un événement de Dublin depuis Paris, l'organisateur lit « GMT+1 Dublin », l'heure dans laquelle ses créneaux sont réellement exprimés.

Contrepartie assumée : un organisateur qui crée depuis un fuseau qui n'est pas celui de son événement enregistre un fuseau faux, sans moyen de le corriger dans l'app.

## 3. Affichage web

### La contrainte ISR

Les surfaces publiques sont en ISR : `m/[slug]` (30s), `circles/[slug]` (60s), `explorer` (300s), `networks/[slug]` (300s), `embed/m/[slug]` (300s). **Un HTML mis en cache ne peut pas contenir une heure propre au visiteur.**

`x-vercel-ip-timezone` (documenté, nom IANA) est écarté : le lire rend la page **dynamique** et supprime l'ISR de toutes les pages publiques — un coût de performance disproportionné, pour une valeur approximative (VPN, IP d'entreprise).

**Approche retenue : formatage côté client, à granularité fine.**

Des fragments clients dédiés — `src/components/moments/local-date-parts.tsx` — reçoivent l'instant et le fuseau de l'événement, et formatent au montage. Les composants parents **restent des server components**.

C'est le point structurant : 4 des 7 composants d'affichage sont serveur (`moment-detail-view`, `moment-timeline-item`, `moment-card`, `embed-event-card`), 3 sont déjà client (`dashboard-moment-card`, `public-moment-card`, `community-card`). Les convertir en client coûterait du bundle et de l'hydratation inutiles ; isoler la date dans un composant client dédié ne coûte que la date.

**Le flash au chargement est inévitable et assumé** : sur du contenu ISR figé, l'heure du visiteur ne PEUT pas être connue côté serveur. Prévoir un rendu initial stable (l'heure dans le fuseau de l'événement) pour éviter un trou de mise en page, corrigé au montage.

### Fichiers concernés

`src/lib/format-date.ts` perd sa constante `TIMEZONE = "Europe/Paris"` (ligne 12), qui irrigue ses **13 helpers exportés** consommés par **15 fichiers**. Les helpers prennent le fuseau en paramètre au lieu de le coder en dur.

`isSameDayInParis` (ligne 121) est à renommer et à re-paramétrer — voir le revirement ci-dessous.

`src/i18n/request.ts:14` (`timeZone: "Europe/Paris"` de next-intl) est à traiter en cohérence.

### ⚠️ Revirement assumé : le badge « Aujourd'hui »

`dashboard-moment-card.tsx:78` et `public-moment-card.tsx:42` ancrent délibérément « Aujourd'hui » sur `Europe/Paris`, avec un commentaire explicite. **L'ADR-0008 inverse ce choix** : le badge repasse au fuseau du visiteur.

Ce point a déjà fait **trois allers-retours en juillet 2026** (fuseau navigateur → Paris au render → mismatch d'hydratation ISR → `useEffect`). La forme correcte est le calcul **client-only** (`useEffect`), pas le retour à `toDateString()` ni le maintien de Paris. Mettre à jour les commentaires des deux fichiers pour que le choix ne soit pas « re-corrigé » plus tard.

## 4. Surfaces serveur

Trois fichiers codent `PLATFORM_TIMEZONE = "Europe/Paris"` en dur et doivent lire le fuseau de l'événement :

- `src/lib/email/format-moment-email.ts:6`
- `src/app/api/cron/send-reminders/build-reminder-email-data.ts:7`
- `src/app/actions/notify-new-moment.ts:6`

Plus `src/app/[locale]/(routes)/m/[slug]/opengraph-image.tsx` (image générée serveur, aucun visiteur).

Ces surfaces **affichent** le fuseau (« 16:30, heure de Dublin » / « 16:30 IST »). Libellés à ajouter en FR et EN.

## 5. Backfill — le point délicat

`@default("Europe/Paris")` ne suffit pas, et un backfill naïf **introduirait des données fausses**.

Les instants UTC en base sont corrects : ils reflètent le fuseau du navigateur de l'organisateur au moment de la saisie. Mais ce fuseau n'a jamais été enregistré. Étiqueter tous les événements existants `Europe/Paris` marquerait l'événement irlandais de 15:30 UTC comme « 17:30 heure de Paris » — alors qu'il se tient à 16:30 à Dublin. L'affichage web resterait juste (il convertit depuis UTC), mais **l'email partirait avec une heure fausse**.

Stratégie proposée :

1. `Europe/Paris` par défaut pour l'immense majorité (organisateurs français).
2. **Recenser les Circles hors France** avant le backfill (champ `Circle.city`, croisé avec les événements à venir) — le volume attendu est faible, une poignée d'événements.
3. Corriger ceux-là à la main, ou demander confirmation à l'organisateur.
4. Ne backfiller finement que les événements **à venir** : le passé n'envoie plus ni email ni rappel, l'enjeu y est nul.

Script dans `scripts/local/` (gitignoré — il nomme des Communautés réelles et le repo est public), dry-run par défaut, idempotent : il ne touche que les événements encore au défaut, donc jamais un fuseau capté après le déploiement.

**Appliqué le 24/08/2026** : recensement sur 88 événements (16 à venir), 4 candidats sans indice français, dont un faux positif (Le Crès, Hérault) et un sans impact (Sahara algérien — Paris et Alger au même offset à la date concernée). Deux événements effectivement repris, ceux du Circle irlandais à l'origine du signalement. Résultat : 86 `Europe/Paris`, 2 `Europe/Dublin`, aucun instant UTC modifié.

**Limite connue du recensement** : il classe par LIEU de l'événement, alors que le champ doit refléter le fuseau de SAISIE. Un organisateur qui saisit depuis un autre fuseau que celui de son événement y échappe — cas identifié, en attente d'arbitrage produit.

## 6. Tests

- **Unitaires** — `time-options` : aller-retour saisie/extraction sur un fuseau ≠ navigateur ; passage à l'heure d'été (les transitions DST sont le nid à bugs) ; `format-date` avec fuseau paramétré.
- `src/lib/__tests__/format-date.test.ts` **va casser** : il assume aujourd'hui `Europe/Paris`. À reprendre.
- **Usecases** — `create-moment` / `update-moment` : persistance du fuseau, valeur par défaut, rejet d'un identifiant IANA invalide.
- **E2E** — `tests/e2e/moment-timezone.spec.ts`, joué sur **Chromium et WebKit** (moteurs lancés explicitement dans le fichier, pour ne pas doubler la durée de toute la suite en CI). Les assertions portent sur l'**écart** entre deux fuseaux, jamais sur une heure en dur : l'instant de l'événement de seed bouge d'un run à l'autre, alors que l'écart Dublin/Paris vaut 60 min en toute saison. Le repli avant hydratation se teste avec `javaScriptEnabled: false`, qui expose exactement le HTML servi.
- **Point d'ancrage DOM** — les fragments de `local-date-parts.tsx` rendent une balise `<time dateTime data-timezone>`. Sans ce marqueur, le test lit parfois le repli serveur au lieu de l'heure hydratée : WebKit hydrate assez lentement pour perdre la course une fois sur deux. Gain de bord : `<time datetime>` est la balise sémantiquement correcte pour une date.
- **Non-régression** — le scénario signalé : saisie 16:30 en `Europe/Dublin`, affichage 16:30 depuis Dublin, 17:30 depuis Paris, email « 16:30, heure de Dublin ».

## 7. Hors périmètre

- Les dates **de compte** (`u/[publicId]`, `admin/users/[id]`, `actions/profile.ts`) : dates sans enjeu horaire, à traiter séparément si besoin de cohérence.
- La **détection automatique** du fuseau depuis l'adresse du lieu (géocodage) : le sélecteur pré-rempli au fuseau du navigateur suffit.
- L'affichage **double** (« 16:30 IST · 17:30 chez vous ») : écarté par l'ADR-0008, mais le fuseau stocké le rend implémentable plus tard **sans nouvelle migration**.

## 8. Ordre d'implémentation suggéré

1. Schema + domaine + repository + `db:push` dev.
2. Saisie (`time-options` avec `date-fns-tz`, sélecteur dans le formulaire) + tests unitaires — **`extractTime` comprise**.
3. Surfaces serveur (emails, Slack, OG) : elles n'ont besoin que du champ, pas du rendu client.
4. Affichage web (`LocalDateTime`, `format-date` paramétré, badge « Aujourd'hui ») + reprise des tests.
5. `db:push:prod` + backfill (dry-run, puis exécution).
6. E2E multi-fuseaux, Chromium + WebKit.

Les étapes 1 à 3 sont livrables seules et corrigent déjà les emails ; l'étape 4 est la plus risquée (hydratation) et mérite sa propre passe de revue.
