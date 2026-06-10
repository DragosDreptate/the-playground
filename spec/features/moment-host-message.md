# Messages de l'Organisateur aux Participants d'un événement

> Issue [#515](https://github.com/DragosDreptate/the-playground/issues/515) — remplace (remplacement strict) le bloc « Inviter ma communauté » de la section « Partager mon événement ».
> Benchmark Luma (« Event Blasts ») : voir le commentaire de l'issue.

## Contexte

L'Organisateur ne peut pas adresser un message libre et ciblé aux Participants inscrits à un événement (rappel pratique, changement de dernière minute, mot d'accueil, suivi post-événement). La communication actuelle se limite aux notifications automatiques.

Le bloc « Inviter ma communauté » actuel sert l'**acquisition** (email d'invitation aux membres du Circle). Il est supprimé. Le nouveau bloc sert la **communication** : un message libre aux Participants **déjà inscrits**.

> Conséquence assumée : on perd l'invitation de la communauté depuis cette section. L'acquisition reste possible via le lien partageable et l'embed.

## Décisions tranchées (2026-06-10)

| Point ouvert | Décision |
|---|---|
| Segments | **Inscrits / Liste d'attente / Tous**. Pas de segment check-in (la feature check-in n'existe pas dans le produit : `CHECKED_IN` est dans l'enum mais aucun usecase ne le pose). Pas de segment `PENDING_APPROVAL` (personnes pas encore acceptées). |
| Anti-abus | **Limite souple** : avertissement « vous avez déjà envoyé un message aujourd'hui » si un envoi a eu lieu dans les dernières 24h, mais pas de blocage. Un changement urgent de dernière minute reste toujours possible. Le cooldown dur 24h de l'ancien broadcast est abandonné. |
| Préférences de notification | **Transactionnel** : toujours délivré, comme les confirmations et rappels existants (qui ne consultent pas les préférences). Pas de filtrage sur `notifyNewMomentInCircle` (préférence d'acquisition, hors sujet pour des inscrits). Pas de nouvelle préférence. |
| Historique | **Champ date simple** : `Moment.lastHostMessageSentAt` (remplace `broadcastSentAt`). Pas de table dédiée, pas de trace du contenu. Sert uniquement la limite souple. |
| Aperçu email avant envoi | Non (post-MVP). Le récapitulatif du nombre de destinataires suffit comme friction avant envoi. |
| Rich text | **Oui, WYSIWYG limité (Tiptap)** : gras, italique, listes, liens. Première intro d'un éditeur rich text dans le projet (les descriptions d'événement sont en texte brut). Approche alignée sur le mode avancé des Event Blasts Luma. Pas de titres ni d'images au MVP. |

## Périmètre MVP

Depuis la page de gestion d'un événement (vue Host), l'Organisateur peut :

1. Ouvrir « Message aux participants » (remplace le bloc « Inviter ma communauté »)
2. Choisir l'**audience** via la **ligne « À »** en tête du dialog (métaphore client mail, format condensé — voir mockup) :
   - **Inscrits** (`REGISTERED`) — segment par défaut
   - **Liste d'attente** (`WAITLISTED`)
   - **Tous** (`REGISTERED` + `WAITLISTED`)

   La ligne « À » porte à la fois le sélecteur de segment **et** le récapitulatif du nombre de destinataires : le compteur du segment sélectionné est affiché dans le sélecteur, et le menu déroulant affiche le compteur de chaque segment. Pas de bloc récapitulatif séparé. **La ligne « À » n'existe que si la liste d'attente est non vide** (sinon il n'y a qu'un segment possible, voir règles métier).
3. Composer un **objet** (texte, max 150 caractères) et un **corps** en rich text via un éditeur WYSIWYG (Tiptap) à barre d'outils restreinte : **gras, italique, liste à puces, liste numérotée, lien**. Limite : 5000 caractères de texte (hors balises).
4. Envoyer → toast de confirmation « Message envoyé à {count} participant(s) ».

Mockup : [`spec/mockups/moment-host-message-dialog.mockup.html`](../mockups/moment-host-message-dialog.mockup.html).

### Règles métier

- **Permissions** : Host / Co-Host actif du Circle de l'événement (`isActiveOrganizer`), + admin en host mode (`isAdminInHostMode`) — même pattern que `broadcast-moment.ts` actuel.
- **Statuts d'événement autorisés** : `PUBLISHED`, `PAST`, `CANCELLED`. Le suivi post-événement et la communication après annulation sont des cas d'usage légitimes. `DRAFT` exclu (aucun inscrit possible de toute façon).
- **Liste d'attente vide** : « Inscrits » et « Tous » deviennent équivalents → **la ligne « À » est entièrement supprimée**. Le récapitulatif du nombre de destinataires est déplacé dans la description du dialog : « Envoyé par email aux **{count} inscrits** de {événement}. » L'envoi cible implicitement le segment `REGISTERED`.
- **Copie de contrôle à l'expéditeur** (décision 2026-06-10, revue de code) : l'expéditeur inscrit reçoit aussi le message, comme tout participant du segment. Il peut ainsi vérifier le rendu reçu et confirmer que l'envoi est bien parti. Le créateur étant auto-inscrit `REGISTERED`, le Host reçoit toujours sa copie ; un Co-Host non inscrit n'en reçoit pas.
- **0 destinataire** : bouton d'envoi désactivé.
- **Limite souple** : si `lastHostMessageSentAt` < 24h, afficher un avertissement non bloquant dans le dialog (ex : « Vous avez déjà envoyé un message il y a moins de 24h. Évitez de solliciter trop souvent vos participants. »).
- **Transactionnel** : aucun filtrage sur les préférences de notification. Le footer de l'email explique pourquoi on le reçoit (« Vous recevez cet email car vous êtes inscrit à {événement} »).
- **Personnalisation prénom** : salutation automatique en tête du corps : « Bonjour {firstName}, » (fallback « Bonjour, » si prénom absent). Pas de système de placeholders dans le corps au MVP.
- **Sanitization HTML** : le corps rich text est sanitizé côté serveur avant persistance de l'envoi et injection dans l'email. Allowlist stricte : `p`, `br`, `strong`, `em`, `ul`, `ol`, `li`, `a[href]` (protocoles `http`/`https`/`mailto` uniquement). Tout le reste est strippé. La limite de 5000 caractères s'applique au texte extrait, vérifiée côté serveur.

### Identité de l'expéditeur

Le message doit se lire comme un message personnel de l'Organisateur, pas comme une notification système (benchmark Luma : nom + photo de l'organisateur).

- **From** : adresse plateforme (contrainte DKIM), mais display name personnalisé : `{prénom de l'auteur} via The Playground <adresse plateforme>`.
- **Reply-To** : email de l'auteur de l'envoi — les réponses arrivent directement chez l'Organisateur (pattern déjà utilisé par `HostContactMessageEmail`).
- **Corps de l'email** : nom (+ avatar si disponible) de l'Organisateur visible en tête.

## Architecture

Conforme au contrat hexagonal du projet.

### Usecase `SendMomentHostMessage` (`src/domain/usecases/send-moment-host-message.ts`)

Entrées : `momentId`, `senderId`, `segment` (`"REGISTERED" | "WAITLISTED" | "ALL"`), `subject`, `body`, `skipAuthorization` (admin host mode).

Logique :
1. Charger le Moment (`MomentRepository`), erreur si introuvable ou `DRAFT`
2. Vérifier l'autorisation (`CircleRepository.findMembership` + `isActiveOrganizer`), sauf `skipAuthorization`
3. Charger les inscrits avec users (`RegistrationRepository.findActiveWithUserByMomentId`), filtrer par segment, exclure `senderId`
4. Erreur typée si 0 destinataire
5. Marquer `lastHostMessageSentAt` avant l'envoi (`MomentRepository.markHostMessageSent`, anti-race comme l'actuel `markBroadcastSent`)
6. Envoyer via `EmailService.sendMomentHostMessages` (fire-and-forget côté action, avec capture Sentry)
7. Retourner `{ recipientCount }`

### Server action (`src/app/actions/send-moment-host-message.ts`)

Session, `isAdminInHostMode`, validation des entrées (longueurs, segment), **sanitization HTML du corps** (allowlist stricte, voir règles métier — la sanitization vit en couche action/lib, jamais dans le domaine qui reste pur), construction des strings i18n, injection des adapters, appel du usecase, mapping erreurs → `ActionResult`. Le usecase reçoit le corps déjà sanitizé (string HTML opaque pour le domaine).

**Locale des emails** : il n'existe pas de préférence de langue par utilisateur (ni `User.locale` ni `Moment.locale`). On suit le pattern existant de `src/lib/email/email-locale.ts` : les strings de l'email (salutation, labels, footer, CTA) sont construites en `DEFAULT_RECIPIENT_LOCALE` (FR), comme le fait l'actuel `broadcast-moment.ts`. C'est cohérent : l'objet et le corps sont de toute façon rédigés par l'Organisateur dans sa langue. À revisiter quand `User.preferredLocale` existera (déjà noté dans le commentaire du resolver).

### Email (`src/infrastructure/services/email/templates/moment-host-message.tsx`)

- Objet : l'objet saisi par l'Organisateur, tel quel
- Tête : identité Organisateur (nom + avatar si dispo)
- Salutation : « Bonjour {firstName}, »
- Corps : HTML sanitizé injecté dans le template (`dangerouslySetInnerHTML` sur le HTML déjà passé par l'allowlist), avec styles inline email-safe pour `strong`, `em`, `ul`/`ol`/`li`, `a`
- Bloc événement : titre, date, lieu, CTA « Voir l'événement » (lien `/m/{slug}`)
- Footer transactionnel : « Vous recevez cet email car vous êtes inscrit à {titre de l'événement}. » (pas de lien de gestion des préférences : message transactionnel)

**Envoi en bulk obligatoire via l'infra existante** : `sendMomentHostMessages` passe par le helper `sendBatch` de `resend-email-service.ts`, qui utilise l'API batch de Resend (`resend.batch.send`) — jamais d'envois unitaires en boucle. Le helper gère déjà : découpage en chunks de 100 (limite Resend), filtrage des adresses @demo.playground / @test.playground, délai de 500ms entre chunks. Un email par destinataire dans le batch (nécessaire pour la salutation personnalisée « Bonjour {firstName}, »), pas de destinataires multiples sur un même email.

> **Limitations de l'API batch Resend** (vérifiées 2026-06-10) : pas de **pièces jointes** (`attachments`) ni d'**envoi programmé** (`scheduled_at`) sur `resend.batch.send`. Le `reply_to` est supporté (notre Reply-To organisateur est donc compatible). Conséquence directe pour le post-MVP : la **planification d'envoi** et les **pièces jointes** ne pourront pas s'appuyer sur l'API batch — il faudra soit une infra de jobs côté plateforme (cron/queue qui déclenche le batch à l'heure dite), soit basculer sur des envois unitaires, à arbitrer le moment venu.

### Modèle de données

- `Moment.broadcastSentAt` → remplacé par `Moment.lastHostMessageSentAt` (`DateTime?`). Perte de l'ancienne valeur acceptée (elle traçait une feature supprimée).
- `MomentRepository.markBroadcastSent` → `markHostMessageSent`.
- Push schema sur dev **et** prod (`pnpm db:push` + `pnpm db:push:prod`).

### UI (`src/components/moments/host-message-dialog.tsx`)

Remplace `broadcast-moment-dialog.tsx` dans `moment-detail-view.tsx` (section « Partager mon événement », vue Host uniquement).

> ⚠️ **Condition d'affichage de la ligne à inverser** : la ligne actuelle est enveloppée dans `moment.status !== "PAST" && moment.status !== "CANCELLED"` (`moment-detail-view.tsx:701`) — visible en DRAFT, masquée après l'événement. La nouvelle ligne suit la logique inverse (voir « Statuts d'événement autorisés ») : la condition devient **`moment.status !== "DRAFT"`**. Ne pas hériter de l'ancienne condition en remplaçant uniquement le composant.

Structure du dialog, du haut vers le bas (voir mockup) :

1. Description du dialog : « Envoyé par email aux participants de {événement}. » — ou, si la liste d'attente est vide, « Envoyé par email aux {count} inscrits de {événement}. » (le compteur remplace la ligne « À » absente)
2. Avertissement limite souple 24h le cas échéant (bandeau ambre non bloquant)
3. **Ligne « À »** (uniquement si `waitlistedCount > 0`) : sélecteur compact (`Select` shadcn) avec les 3 segments et leur compteur dans le menu. Le sélecteur affiche toujours « {segment} · {count} »
4. Champ objet
5. Éditeur rich text (compteur de caractères dans le label)
6. Pied : Annuler (`outline`) / Envoyer (`default`, désactivé si objet ou corps vide, ou 0 destinataire)

Le composant reçoit en props depuis la page serveur : `registeredCount`, `waitlistedCount`, `lastHostMessageSentAt`. Si `waitlistedCount === 0`, pas de ligne « À » : l'envoi cible `REGISTERED` et le compteur vit dans la description.

### Éditeur rich text (`src/components/ui/rich-text-editor.tsx`)

Nouveau composant **réutilisable** (candidat futur pour la description d'événement), basé sur Tiptap :

- Dépendances : `@tiptap/react`, `@tiptap/starter-kit` (extensions non utilisées désactivées), `@tiptap/extension-link`
- Barre d'outils : gras, italique, liste à puces, liste numérotée, lien (popover de saisie d'URL)
- Sortie : HTML (`editor.getHTML()`), compteur de caractères sur le texte brut
- Style : aligné shadcn/ui (mêmes tokens que `Textarea` pour la zone d'édition)
- La sanitization ne se fait PAS dans le composant (client non fiable) : toujours côté serveur

## Suppressions (remplacement strict)

| Élément | Action |
|---|---|
| `src/components/moments/broadcast-moment-dialog.tsx` | Supprimé, remplacé par `host-message-dialog.tsx` |
| `src/app/actions/broadcast-moment.ts` | Supprimé, remplacé par `send-moment-host-message.ts` |
| `src/infrastructure/services/email/templates/broadcast-moment.tsx` | Supprimé, remplacé par `moment-host-message.tsx` |
| `sendBroadcastMoments` dans `resend-email-service.ts` (+ port `EmailService`) | Supprimé, remplacé par `sendMomentHostMessages` |
| `Moment.broadcastSentAt` + `markBroadcastSent` | Renommés (voir modèle de données) |
| i18n `Moment.broadcast.*` (16 clés) et `Email.broadcastMoment.*` (fr + en) | Supprimés, remplacés par `Moment.hostMessage.*` et `Email.momentHostMessage.*` |
| **Page Aide** : section `Help…contact` (fr.json ~ligne 1811 + en.json) qui décrit « le bouton Inviter ma communauté » et le cooldown 24h | Réécrite pour décrire la nouvelle feature (message aux inscrits, segments, limite souple) |
| Mocks de tests : `mock-moment-repository.ts` (`markBroadcastSent`, `broadcastSentAt`) et `mock-email-service.ts` (`sendBroadcastMoments`) | Mis à jour avec les nouveaux noms (`markHostMessageSent`, `lastHostMessageSentAt`, `sendMomentHostMessages`) |
| Test E2E `tests/e2e/broadcast-moment.spec.ts` | Supprimé, remplacé par un E2E du nouveau parcours (voir Tests) |

## Tests

- **Usecase (unitaires, ports mockés)** : autorisation (Host ok, Co-Host actif ok, Player refusé, membership inactif refusé, non-membre refusé), segments (REGISTERED / WAITLISTED / ALL), copie de contrôle à l'expéditeur inscrit, 0 destinataire → erreur typée, DRAFT → erreur, PAST/CANCELLED → autorisés, pas de filtrage sur les préférences de notification, `markHostMessageSent` appelé avant l'envoi.
- **Sanitization (unitaires)** : tags hors allowlist strippés (`script`, `img`, `iframe`, handlers `on*`), protocoles interdits sur les liens (`javascript:`) neutralisés, limite 5000 caractères sur le texte extrait.
- **Tests d'autorisation sécurité** : ajouter le usecase à la suite `co-host-authorization.test.ts` existante.
- **E2E** : `tests/e2e/broadcast-moment.spec.ts` casse avec la suppression du bouton → le remplacer par un scénario du nouveau parcours (ouvrir le dialog, choisir un segment, composer, envoyer, toast). ⚠️ Ce test déclenche des envois d'emails : lire **`spec/email-testing.md`** avant de l'écrire ou de le lancer (vérifier `AUTH_RESEND_KEY` commentée, jamais de `--repeat-each`/`--retries` sans cette vérification).
- **Suppression** : retirer les tests unitaires de l'ancien broadcast.

## Post-MVP (backlog, hors scope)

- Planification d'envoi (date/heure) — nécessite une infra de jobs ; non supporté par l'API batch Resend (`scheduled_at` indisponible en batch, voir limitations dans la section Email)
- Templates / messages types (rappel pratique, changement, mot d'accueil, suivi post-événement)
- Historique des messages envoyés (table dédiée : contenu, segment, compteur, auteur)
- Aperçu du rendu email avant envoi
- Segment « présents au check-in » (si la feature check-in voit le jour)
- Extensions rich text : titres, images, boutons, pièces jointes (mode avancé Luma complet) — les pièces jointes ne sont pas supportées par l'API batch Resend (voir limitations dans la section Email)
- Réutilisation de l'éditeur rich text pour la description d'événement
