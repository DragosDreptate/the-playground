# Feature — Suppression du lien d'invitation (invite token)

**Statut :** Spec validée — prête pour implémentation
**Date :** 2026-04-08
**Contexte :** Le lien d'invitation (`/circles/join/[token]`) est fonctionnellement redondant avec le lien partageable (`/circles/[slug]`). Les deux permettent de rejoindre une Communauté (publique ou privée) avec la même logique d'approbation. Le token n'apporte ni bypass d'approbation, ni restriction d'accès, ni traçabilité. Cette spec élimine la redondance.

---

## Positionnement

### Ce qui est supprimé

- Le champ `inviteToken` sur Circle (schema, domaine, repository)
- Les usecases `generateCircleInviteToken`, `revokeCircleInviteToken`, `joinCircleByInvite`
- Les server actions associées (`generateCircleInviteTokenAction`, `revokeCircleInviteTokenAction`, `joinCircleByInviteAction`)
- La route `/circles/join/[token]` (page + layout)
- Le composant `JoinCircleByInviteForm`
- La section « Lien d'invitation » du composant `CircleShareInviteCard`
- L'erreur `InvalidInviteTokenError`
- Tous les tests unitaires, de sécurité et E2E liés au token d'invitation

### Ce qui est conservé

- **Lien partageable** (`/circles/[slug]`) — inchangé, c'est le seul lien
- **Inviter par email** — conservé, mais l'email envoie le lien public `/circles/[slug]` au lieu du lien token
- **Template email d'invitation** — conservé, adapté pour utiliser l'URL publique
- **Le parcours de join** via la page publique Circle — inchangé

### Ce qui change dans l'UX

La carte « Partager & Inviter » du dashboard passe de 3 sections à 2 :

| Avant | Après |
| --- | --- |
| Lien partageable | Lien partageable (inchangé) |
| Inviter par email | Inviter par email (URL publique au lieu du token) |
| ~~Lien d'invitation~~ | **Supprimé** |

---

## Pourquoi cette suppression

1. **Redondance fonctionnelle** — les deux liens aboutissent au même résultat (join avec ou sans approbation)
2. **Pas de différence pour les Communautés privées** — la page publique `/circles/[slug]` montre le bouton rejoindre même pour les Communautés privées
3. **Le token ne bypass rien** — `joinCircleByInvite` et `joinCircleDirectly` ont la même logique `requiresApproval`
4. **Révocabilité inutile** — révoquer un lien après que les gens aient rejoint n'a pas de valeur
5. **Complexité gratuite** — 30+ fichiers, 3 usecases, 1 route, 1 composant, 500+ lignes de tests pour zéro valeur ajoutée

### Évolution future possible

Si un jour on veut que l'invitation apporte une vraie valeur (bypass de l'approbation, expiration, traçabilité), on réintroduira le mécanisme avec une différenciation fonctionnelle réelle.

---

## Plan de suppression détaillé

### 1. Schema Prisma

Supprimer le champ `inviteToken` du model Circle :

```prisma
// SUPPRIMER :
inviteToken String? @unique @map("invite_token")
```

Push dev + prod. Le champ est nullable, donc la suppression de colonne est sans risque pour le code. Les tokens existants en DB seront perdus — c'est acceptable car ils n'ont plus de valeur fonctionnelle (le code qui les consomme est supprimé).

### 2. Domain model

**`src/domain/models/circle.ts`**
- Supprimer `inviteToken: string | null` du type `Circle`

### 3. Ports

**`src/domain/ports/repositories/circle-repository.ts`**
- Supprimer `inviteToken?: string | null` de `UpdateCircleInput`
- Supprimer la méthode `findByInviteToken(token: string): Promise<Circle | null>`

**`src/domain/ports/services/email-service.ts`**
- Modifier `CircleInvitationEmailData` : remplacer `inviteUrl` par `circleUrl` (URL publique `/circles/[slug]`)
- Modifier `CircleInvitationsBatchEmailData` : idem

### 4. Usecases — Suppression complète

Supprimer ces 3 fichiers :
- `src/domain/usecases/generate-circle-invite-token.ts`
- `src/domain/usecases/revoke-circle-invite-token.ts`
- `src/domain/usecases/join-circle-by-invite.ts`

### 5. Erreurs domaine

**`src/domain/errors/circle-errors.ts`**
- Supprimer la classe `InvalidInviteTokenError`

### 6. Repository Prisma

**`src/infrastructure/repositories/prisma-circle-repository.ts`**
- Supprimer le mapping `inviteToken` dans `toDomainCircle()`
- Supprimer le spread `inviteToken` dans `update()`
- Supprimer la colonne `invite_token` dans la raw query `findAllByUserIdWithStats()`
- Supprimer la méthode `findByInviteToken()`

### 7. Service email

**`src/infrastructure/services/email/resend-email-service.ts`**
- Modifier `sendCircleInvitation()` et `sendCircleInvitations()` : utiliser `circleUrl` au lieu de `inviteUrl`

**`src/infrastructure/services/email/templates/circle-invitation.tsx`**
- Modifier le CTA : le bouton pointe vers l'URL publique `/circles/[slug]` au lieu du lien token

### 8. Server actions

**`src/app/actions/circle.ts`**
- Supprimer les imports des 3 usecases (`generateCircleInviteToken`, `revokeCircleInviteToken`, `joinCircleByInvite`)
- Supprimer `generateCircleInviteTokenAction()`
- Supprimer `revokeCircleInviteTokenAction()`
- Supprimer `joinCircleByInviteAction()`
- Modifier `inviteToCircleByEmailAction()` :
  - Ne plus appeler `generateCircleInviteToken` — le remplacer par `circleRepository.findById(circleId)` pour charger le circle
  - **Ajouter un check d'autorisation HOST explicite** (`findMembership` + vérifier `role === "HOST"`) — aujourd'hui l'autorisation était portée par le usecase `generateCircleInviteToken`, qui est supprimé. Sans ce check, n'importe quel membre pourrait envoyer des invitations. C'est un point de sécurité critique.
  - Construire l'URL publique `${baseUrl}/circles/${circle.slug}` à la place du lien token
  - Passer `circleUrl` au service email au lieu de `inviteUrl`

### 9. Routes — Suppression

Supprimer le dossier entier :
- `src/app/[locale]/(routes)/circles/join/layout.tsx`
- `src/app/[locale]/(routes)/circles/join/[token]/page.tsx`

### 10. Composants

**Supprimer :**
- `src/components/circles/join-circle-by-invite-form.tsx`

**Modifier :**
- `src/components/circles/circle-share-invite-card.tsx` :
  - Supprimer la section « Lien d'invitation » (génération, affichage, révocation)
  - Supprimer les states et handlers liés au token (`inviteUrl`, `generateToken`, `revokeToken`)
  - Conserver la section « Lien partageable »
  - Conserver la section « Inviter par email » (mais avec URL publique)
  - Supprimer les props de traduction liées au token (`linkTitle`, `linkDescription`, `linkGenerate`, `linkRevoke`, `linkRevoked`)

### 11. Dashboard page

**`src/app/[locale]/(routes)/dashboard/(app)/(main)/circles/[slug]/page.tsx`**
- Supprimer l'import et l'appel à `generateCircleInviteToken` (auto-génération du token)
- Supprimer les props de traduction du token passées à `CircleShareInviteCard`
- Passer l'URL publique au composant au lieu du circle complet (ou adapter)

### 12. i18n

**`messages/fr.json`**** et \****`messages/en.json`** — supprimer les clés devenues orphelines :

```
Circle.invite.linkTitle
Circle.invite.linkDescription
Circle.invite.linkGenerate
Circle.invite.linkRevoke
Circle.invite.linkRevoked
Circle.invite.joinButton
Circle.invite.joinSignIn
Circle.invite.alreadyMember
Circle.invite.pendingApproval
Circle.invite.joinRequiresApproval
Circle.invite.invalidToken
Circle.invite.viewCircle
Circle.invite.copyLink
```

Conserver les clés utilisées par le lien partageable et l'email :

```
Circle.invite.cardTitle
Circle.invite.shareableLink
Circle.invite.emailTitle
Circle.invite.emailPlaceholder
Circle.invite.emailAdd
Circle.invite.emailSend
Circle.invite.emailSendMultiple
Circle.invite.emailSent
Circle.invite.emailInvalid
Circle.invite.emailAddMore
Circle.invite.emailMaxReached
```

Conserver sans modification les clés du template email :

```
Email.circleInvitation.subject
Email.circleInvitation.ctaLabel
Email.circleInvitation.footer
```

### 13. Lab / Email preview

**`src/app/[locale]/(routes)/lab/emails/page.tsx`**
- Adapter la preview de l'email d'invitation : utiliser `circleUrl` au lieu de `inviteUrl`

### 14. Tests — Suppression

Supprimer ces fichiers entièrement :
- `src/domain/usecases/__tests__/join-circle-by-invite.test.ts`
- `src/domain/usecases/__tests__/generate-circle-invite-token.test.ts`
- `src/domain/usecases/__tests__/revoke-circle-invite-token.test.ts`
- `src/domain/usecases/__tests__/security/circle-invite-security.test.ts`
- `tests/e2e/circle-invite.spec.ts`

### 15. Tests — Modification

**`src/domain/usecases/__tests__/helpers/mock-circle-repository.ts`**
- Supprimer `findByInviteToken` du mock
- Supprimer `inviteToken` de `makeCircle()`

**`tests/e2e/approval-registration.spec.ts`**
- La section `"Circle membership approval — invite token"` (lignes 174-212) utilise `extractInviteToken()`, navigue vers `/circles/join/[token]`, et teste le flow d'approbation via invite token
- **Réécrire cette section** pour utiliser le lien public `/circles/[slug]` au lieu du lien token : le Participant visite la page publique de la Communauté avec approbation et clique sur S'inscrire
- Supprimer la fonction helper `extractInviteToken()`

### 16. Documentation

Mettre à jour les références dans :
- `spec/features/co-organisateurs.md` — retirer les mentions de `generate-circle-invite-token` et `revoke-circle-invite-token`
- `spec/features/bulk-invite.md` — adapter pour refléter l'utilisation de l'URL publique
- `spec/features/approval-registration.md` — retirer les mentions de `joinCircleByInvite`
- `CLAUDE.md` — mettre à jour la section E2E (retirer `circle-invite` de la liste des specs)

---

## Fichiers impactés — Résumé

| Action | Fichiers |
| --- | --- |
| **Supprimer entièrement** (11 fichiers) | 3 usecases, 1 composant, 2 fichiers route, 5 fichiers de tests |
| **Modifier** (13 fichiers) | schema, domain model, 2 ports, 1 adapter repository, 1 server action, 1 composant, 1 dashboard page, 1 email template, 1 email service, 1 lab preview, 1 mock repository, 1 E2E approval-registration |
| **i18n** (2 fichiers) | Supprimer ~13 clés, conserver ~11 clés + 3 clés email |
| **Documentation** (4 fichiers) | Mise à jour des références |

**Total : \~30 fichiers impactés**

---

## Plan d'implémentation (ordre recommandé)

| Étape | Description |
| --- | --- |
| 1 | Supprimer les 3 usecases + erreur `InvalidInviteTokenError` |
| 2 | Supprimer le champ `inviteToken` du domain model + ports |
| 3 | Supprimer `findByInviteToken` du repository adapter |
| 4 | Nettoyer le mapping dans `toDomainCircle`, `update`, `findAllByUserIdWithStats` |
| 5 | Supprimer les 3 server actions token + modifier `inviteToCircleByEmailAction` (ajouter check HOST explicite) |
| 6 | Supprimer la route `/circles/join/[token]` + layout + composant `JoinCircleByInviteForm` |
| 7 | Simplifier `CircleShareInviteCard` (retirer section token) |
| 8 | Nettoyer la dashboard page (retirer auto-génération token + props) |
| 9 | Adapter le template email + service email (`inviteUrl` → `circleUrl`) |
| 10 | Adapter la page lab email preview |
| 11 | Supprimer les 5 fichiers de tests + nettoyer le mock repository + réécrire section invite de `approval-registration.spec.ts` |
| 12 | Supprimer les clés i18n orphelines |
| 13 | Schema Prisma : supprimer `inviteToken` + push dev/prod |
| 14 | Mettre à jour la documentation |
| 15 | Typecheck + vérification tests restants |

> **Note :** le schema Prisma est modifié en dernier pour éviter de casser le build pendant le refactoring. On supprime d'abord tout le code qui référence `inviteToken`, puis le champ.

---

## Risques et points d'attention

| Risque | Mitigation |
| --- | --- |
| **Régression sécurité sur \****`inviteToCircleByEmailAction`** | Le check d'autorisation HOST était porté par le usecase `generateCircleInviteToken` (supprimé). **Ajouter un check explicite** `findMembership` + `role === "HOST"` dans l'action. Point critique — à vérifier en premier. |
| Liens d'invitation déjà partagés deviennent 404 | Acceptable — ces liens n'étaient pas utilisés en production de façon significative. Pas de redirection nécessaire. |
| Email d'invitation avec ancien format | Les emails déjà envoyés contiennent le token URL → 404. Acceptable car les emails sont éphémères. |
| Perte des tokens en DB | Les tokens existants sont supprimés avec la colonne. Acceptable car le code qui les consomme est supprimé — ils n'ont plus de valeur fonctionnelle. |
| Régression sur l'email d'invitation | Tester manuellement l'envoi d'email depuis le dashboard après modification |
| Tests E2E `approval-registration.spec.ts` | La section « invite token » doit être réécrite pour utiliser le lien public. Ne pas simplement supprimer — le scénario d'approbation depuis la page publique doit rester couvert. |
