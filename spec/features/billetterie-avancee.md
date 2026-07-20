# Billetterie avancée — Multi-tarifs & Coupons de réduction

> Statut : **cadrage / à décider** (2026-07-20). Non implémenté.
> Origine : demande de Bayane Ehlm (Padel Girls Club) — proposer deux prix pour un même événement (licencié / non-licencié), puis question sur les coupons de réduction.
> Décision produit préalable requise : voir §14 « Décisions ouvertes ». Cette spec cadre le **quoi** et le **comment**, pas le **quand**.

## 1. Contexte et dissipation d'un malentendu

Le MVP paiement (voir [`stripe-connect.md`](stripe-connect.md)) impose **un seul prix par événement** : `Moment.price` est un entier unique (`prisma/schema.prisma:251`), et le checkout envoie `unit_amount: moment.price` (`stripe-payment-service.ts`).

**Ce n'est PAS une limitation de Stripe Connect.** Stripe accepte n'importe quel montant au checkout ; on pourrait avoir 2, 5 ou 10 tarifs sans changer une ligne côté Stripe. Le « un seul prix » est un **choix de design MVP** (benchmark Luma : formulaire minimaliste). De même, **aucune de ces deux features ne dépend du chantier wallet** ([`psp-alternatives-stripe.md`](../research/psp-alternatives-stripe.md)) : elles sont faisables avec le Stripe Connect actuel. Le wallet ne débloque que la commission plateforme et le pilotage fin des flux, pas les tarifs ni les coupons.

**Dette à corriger indépendamment** : le checkout active déjà `allow_promotion_codes: true` (`stripe-payment-service.ts:112`) alors qu'aucun coupon n'existe. Un champ « code promo » s'affiche donc sur le checkout Stripe sans qu'aucun code ne fonctionne (confusion), et tout coupon créé côté compte plateforme serait **global** (valable pour toutes les Communautés). À passer à `false` tant qu'un vrai système n'est pas en place.

## 2. Objectif et principes

Permettre à un Organisateur de :
1. Définir **plusieurs tarifs nommés** pour un même événement (ex. « Licencié » 5 €, « Non-licencié » 10 €), le Participant choisissant le sien à l'inscription.
2. Créer des **coupons de réduction** (code) applicables à ses événements.

Principes directeurs :
- **Progressive disclosure** — le défaut reste **un seul prix** (cas 90%). La billetterie avancée est une **option repliée par défaut**, conforme à la philosophie Luma « moins de réglages = meilleure adoption » (CLAUDE.md).
- **Multi-tenant strict** — un tarif/coupon appartient à un Circle/Moment et n'agit jamais hors de son périmètre.
- **Architecture hexagonale** — nouveaux models domaine purs, ports/adapters, usecases injectés, aucun couplage Stripe dans le domaine.
- **Anti-abus by design** — les coupons sont un vecteur d'abus (fuite virale, réutilisation) : garde-fous dès la v1.

## 3. Périmètre

### Niveau 1 — DANS le périmètre (cette spec)

- Plusieurs tarifs nommés par événement (label + prix).
- Choix du tarif par le Participant à l'inscription.
- **Capacité globale unique** partagée par tous les tarifs (pas de quota par tarif).
- **Prix en euros entiers, sans centimes** (décision 2026-07-20) : tarifs et coupons se saisissent en euros pleins. Stockage interne toujours en centimes (multiples de 100, convention Stripe).
- **Gratuité ponctuelle sur événement payant = coupon 100%** (décision 2026-07-20) : pas de tarif à 0 € coexistant avec des tarifs payants. Un invité / licencié exempté / VIP reçoit un code de réduction à 100%, qui amène le montant à 0 → inscription directe. Un seul mécanisme (le coupon) couvre toutes les réductions, gratuité totale incluse, avec le contrôle anti-abus qui va avec (le tarif « gratuit » auto-sélectionnable serait, lui, ouvert à l'abus).
- Coupons de réduction (% ou montant fixe), périmètre Circle ou Moment.
- Anti-abus coupons : quota d'usage, un usage par utilisateur, expiration.
- Déclaratif : rien ne « prouve » qu'un Participant a droit au tarif licencié (confiance, comme la majorité des billetteries de club).

### Niveau 2 — HORS périmètre (backlog si besoin avéré)

- Quota de places **par tarif** (« 20 licenciés, 10 non-licenciés »).
- Tarifs à **fenêtre temporelle** (early bird, tarifs qui expirent).
- **Vérification** du droit au tarif (liste blanche licenciés, code d'accès par tarif).
- Coupons **cumulables** entre eux.
- Frais de service configurables / commission plateforme (dépend du chantier wallet).

## 4. Terminologie

| Concept | Code (EN) | FR user-facing | EN user-facing |
|---|---|---|---|
| Tarif | `TicketType` | Tarif | Ticket type |
| Coupon | `Coupon` | Code de réduction | Discount code |
| Réduction en % | `PERCENTAGE` | Réduction en pourcentage | Percentage off |
| Réduction fixe | `FIXED_AMOUNT` | Réduction d'un montant | Amount off |

Terminologie projet inchangée : Circle → Communauté, Moment → événement, Host → Organisateur, Player → Participant. Action sur un événement = **S'inscrire** (FR) / **Join** (EN).

## 5. Modèle de données (Prisma)

### Nouveau modèle `TicketType`

```prisma
model TicketType {
  id        String   @id @default(cuid())
  momentId  String
  label     String                      // "Licencié", "Non-licencié"
  price     Int                         // centimes, multiple de 100 (euros entiers). > 0 sur événement payant (gratuité = coupon 100%)
  position  Int      @default(0)        // ordre d'affichage
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  moment        Moment         @relation(fields: [momentId], references: [id], onDelete: Cascade)
  registrations Registration[]

  @@index([momentId])
  @@map("ticket_types")
}
```

### Nouveau modèle `Coupon`

```prisma
model Coupon {
  id         String          @id @default(cuid())
  circleId   String                             // périmètre : toujours rattaché à un Circle
  momentId   String?                            // null = valable sur tous les événements du Circle
  code       String                             // saisi par le Participant (normalisé upper-case)
  type       CouponType                         // PERCENTAGE | FIXED_AMOUNT
  value      Int                                // PERCENTAGE : 1-100 (%) · FIXED_AMOUNT : centimes multiple de 100 (euros entiers)
  maxUses    Int?                               // null = illimité (déconseillé)
  usedCount  Int             @default(0)
  validFrom  DateTime?
  validUntil DateTime?
  active     Boolean         @default(true)
  createdAt  DateTime        @default(now())
  updatedAt  DateTime        @updatedAt

  circle        Circle         @relation(fields: [circleId], references: [id], onDelete: Cascade)
  moment        Moment?        @relation(fields: [momentId], references: [id], onDelete: Cascade)
  registrations Registration[]

  @@unique([circleId, code])                     // code unique par Communauté
  @@index([momentId])
  @@map("coupons")
}

enum CouponType {
  PERCENTAGE
  FIXED_AMOUNT
}
```

### Modifications `Registration`

```prisma
  ticketTypeId   String?     // tarif choisi (null = event mono-prix ou gratuit historique)
  couponId       String?     // coupon appliqué le cas échéant
  amountPaid     Int?        // montant réellement payé en centimes (après réduction) — audit
```

### `Moment` — rétrocompatibilité (décision d'archi)

**`Moment.price` est conservé tel quel.** Un événement sans `TicketType` garde le comportement actuel (prix scalaire, cas simple). Un événement avec ≥1 `TicketType` bascule en mode multi-tarifs : `price` n'est plus la source de vérité (affiché comme « à partir de X » si utile).

- **Avantage** : zéro migration des données existantes (colonnes/tables nouvelles, nullable). Le défaut « un prix » reste natif.
- **Alternative écartée** : tout migrer en `TicketType` (un tarif unique pour chaque event existant). Plus pur, mais migration de données lourde dev+prod et complexité inutile pour le cas 90%.

> **IMPORTANT** : à chaque modif du schema, pousser sur les deux branches (`pnpm db:push` puis `pnpm db:push:prod`).

## 6. Couche domaine

- **Models** (`domain/models/`) : `ticket-type.ts` (type `TicketType`), `coupon.ts` (type `Coupon` + `CouponType`). Le `Moment` gagne un `ticketTypes: TicketType[]` (chargé quand pertinent).
- **Erreurs** (`domain/errors/`) : `TicketTypeLockedError`, `InvalidTicketTypeError`, `CouponNotFoundError`, `CouponExpiredError`, `CouponUsageLimitReachedError`, `CouponAlreadyUsedByUserError`, `CouponNotApplicableError`.
- **Value / calcul pur** : `computeFinalAmount(ticketPrice, coupon)` → montant final borné (jamais < 0), avec règle de plancher Stripe (§10).
- **Usecases impactés / nouveaux** :
  - `create-moment` / `update-moment` : CRUD des tarifs + verrouillage (§10).
  - Nouveaux : `create-ticket-type`, `update-ticket-type`, `delete-ticket-type`, `create-coupon`, `update-coupon`, `delete-coupon`, `validate-coupon` (validation pure, réutilisée UI + checkout).
  - `join-moment` (flux gratuit) : accepte un `ticketTypeId` ; si le tarif choisi + coupon = 0 €, inscription directe.
  - Flux payant (via `checkout.ts`) : `validate-coupon` + calcul montant → `createCheckoutSession`.
- **Autorisation** : seul un Host/Co-Host du Circle crée/modifie tarifs et coupons (tests dédiés). Un Participant ne peut appliquer qu'un coupon du périmètre de l'événement visé.

## 7. Couche infrastructure

- **Repositories** : `PrismaTicketTypeRepository`, `PrismaCouponRepository` (implémentent les ports). Incrément atomique de `Coupon.usedCount` (transaction, éviter la course au dernier usage).
- **`stripe-payment-service.ts`** :
  - `createCheckoutSession` reçoit le tarif + coupon résolus → `unit_amount` = montant final ; `product_data.name` = `"{titre} — {label tarif}"`.
  - **Désactiver `allow_promotion_codes`** (on gère les coupons en amont).
  - `metadata` enrichi : `ticketTypeId`, `couponId` (en plus de userId/momentId/circleId).
  - **Webhook** `checkout.session.completed` : relit `ticketTypeId`/`couponId` dans les metadata, crée la `Registration` avec `ticketTypeId`, `couponId`, `amountPaid`, et incrémente `usedCount` du coupon **à la confirmation du paiement** (pas à la saisie).

## 8. Flux détaillés

### Création (Organisateur)
1. Formulaire événement : bloc « Billetterie » repliable. Défaut = un prix (actuel).
2. « Ajouter un tarif » → bascule en multi-tarifs (répéteur label + prix).
3. Onglet/section « Codes de réduction » (niveau Circle et/ou événement) : CRUD coupons.

### Inscription (Participant) — page publique `m/[slug]`
1. Si multi-tarifs : **choix du tarif** (radio) avant le CTA.
2. Champ « Code de réduction » optionnel → `validate-coupon` en direct (feedback : réduction affichée ou message d'erreur).
3. Montant final calculé et affiché (TTC, cf. règle d'affichage existante).
4. Routage :
   - Montant final **= 0** → inscription directe (`join-moment`), pas de checkout.
   - Montant final **≥ 50 c** → checkout Stripe avec montant réduit.
5. Retour de paiement → webhook crée la `Registration` complète.

## 9. Capacité et liste d'attente

- **Capacité globale** unique (`Moment.capacity`), partagée par tous les tarifs (niveau 1). Le décompte des places reste global.
- Règle existante préservée : **pas de liste d'attente sur événement payant** ([`stripe-connect.md`](stripe-connect.md)). Vaut dès qu'au moins un tarif est payant.

## 10. Règles métier

| Règle | Comportement |
|---|---|
| Verrouillage d'un tarif | Un `TicketType` avec ≥1 inscription : **prix et suppression bloqués** (`TicketTypeLockedError`). Cohérent avec le verrouillage de prix actuel. |
| Ajout de tarif | Autorisé même après des inscriptions (n'affecte pas l'existant). |
| Suppression de tarif | Autorisée uniquement si 0 inscription sur ce tarif. |
| Euros entiers | Tarifs et coupons en euros pleins. Le montant payé est toujours un multiple de 100 c. Minimum d'un événement payant = **1 €** (le plancher Stripe 0,50 € devient sans objet). |
| Arrondi coupon % | Un coupon en % peut produire des centimes (10 € −33 % = 6,70 €). Le montant final est **arrondi à l'euro inférieur**, toujours en faveur du Participant (10 € −33 % = 6 €). |
| Réduction à 0 € | Uniquement via **coupon 100%** → inscription directe sans checkout (bypass Stripe). Plus de tarif à 0 € sur événement payant. |
| Qui absorbe la réduction | L'**Organisateur** (le transfer Stripe est réduit d'autant). À expliciter dans l'UI orga. |
| Affichage prix | Inchangé : le Participant paie exactement le montant affiché, mention TTC (obligation B2C France). |
| Coupon expiré / plein / hors périmètre | Refus à la validation avec message ciblé. |

## 11. Anti-abus coupons (obligatoire v1)

- **`maxUses`** : quota global d'utilisations (UI : recommandé, warning si laissé illimité).
- **Un usage par utilisateur** : contrôle via `Registration.couponId` + `userId` (un même User ne réutilise pas le code).
- **Expiration** : `validUntil` fortement encouragé.
- **Incrément atomique** de `usedCount` à la confirmation de paiement (transaction) pour éviter le dépassement en concurrence.
- **Normalisation** du code (trim + upper-case) pour éviter les doublons de casse.
- Pas de bruteforce : validation côté serveur uniquement, rate-limit sur l'endpoint de validation (réutiliser le pattern rate-limit existant).

## 12. UI / Design system

- **Dashboard orga** : section « Billetterie » (tarifs) + « Codes de réduction » (coupons). Respecter la règle **un seul bouton `default` par section** ; « Ajouter un tarif / un code » en `default`, le reste en `outline`/`ghost`.
- **Suppression** : trigger `variant="outline" size="sm"` + classes destructive, `AlertDialogAction` en `bg-destructive` (pattern normatif CLAUDE.md).
- **Champs** : pas de ring rose au focus (primitives `ui/input` etc. déjà conformes).
- **Formulaire création** (`moment-form-options-section.tsx`) : répéteur de tarifs, replié par défaut.
- **Page publique** (`registration-button.tsx` + page `m/[slug]`) : sélecteur de tarif + champ code promo, mobile-first (parcours Participant prioritairement mobile — ne pas modifier le comportement mobile sans validation).

## 13. Transverse

- **i18n** : toutes les clés FR/EN (`messages/fr.json`, `messages/en.json`) synchronisées. Page Aide à mettre à jour.
- **Emails** : confirmation d'inscription mentionne le tarif choisi et le montant payé (après réduction).
- **Export CSV** des inscrits : colonnes « Tarif » et « Code utilisé / Montant payé ».
- **Sitemap** : sans objet (pas de nouvelle route publique).

## 14. Décisions (tranchées & ouvertes)

> **Encore ouvertes à ce jour (2026-07-20)** : 1 (vision), 3 (périmètre coupon), 5 (phasage). Les autres sont tranchées ci-dessous.

1. **Vision** — ⏳ **OUVERT** : la billetterie avancée entre-t-elle dans le positionnement, ou reste-t-on « un événement = un prix » ? (décision structurante → à consigner dans `decisions.md` une fois tranchée).
2. ~~Coupon entre 1 et 49 c~~ → **TRANCHÉ (2026-07-20)** : prix et coupons en euros entiers, sans centimes. Minimum event payant = 1 €.
3. **Périmètre coupon par défaut** — ⏳ **OUVERT** : proposer d'abord le niveau Circle, le niveau événement, ou les deux dès la v1 ?
4. ~~Événements mixtes gratuit/payant~~ → **TRANCHÉ (2026-07-20)** : pas de tarif à 0 € sur event payant ; la gratuité passe par un coupon 100%.
5. **Phasage** — ⏳ **OUVERT** : livrer multi-tarifs et coupons ensemble (UI billetterie mutualisée) ou multi-tarifs d'abord (besoin explicite de Bayane), coupons ensuite ?
6. ~~Sens d'arrondi des coupons %~~ → **TRANCHÉ (2026-07-20)** : coupons % conservés ; montant final **arrondi à l'euro inférieur**, toujours en faveur du Participant.

## 15. Phasage proposé

- **Lot 0 (quick fix, indépendant)** : `allow_promotion_codes: false` pour retirer le champ mort. Petit, isolé.
- **Lot 1 — Multi-tarifs** : schema `TicketType` + domaine + checkout + UI création/inscription + tests + i18n. Répond au besoin direct de Bayane.
- **Lot 2 — Coupons** : schema `Coupon` + validation + anti-abus + UI CRUD + application au checkout + tests + i18n.

Les deux lots partagent la même surface « Billetterie » du dashboard : les concevoir de façon cohérente même si livrés séparément.

## 16. Tests (contrat strict)

- **Usecases** : création/verrouillage tarifs, `validate-coupon` (expiré, plein, hors périmètre, déjà utilisé), calcul montant final (plancher 50 c, réduction 0 €), `join-moment` avec tarif gratuit.
- **Autorisation** : un non-Host ne crée pas de tarif/coupon ; un coupon d'un Circle ne s'applique pas à un autre Circle.
- **Intégration** : repositories `TicketType`/`Coupon`, incrément atomique `usedCount` sous concurrence.
- **E2E Playwright** : inscription à un événement multi-tarifs (choix + paiement), application d'un coupon, coupon expiré/plein, événement mixte gratuit/payant.
