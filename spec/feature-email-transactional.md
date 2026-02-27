# Emails transactionnels — Spec d'implémentation

> Emails envoyés automatiquement lors d'actions clés du parcours Participant et Organisateur.
> Architecture : Resend + react-email, fire-and-forget depuis les server actions.
>
> Référence backlog : section "Notifications email"

---

## Vision produit

Les emails transactionnels sont le premier canal de communication entre la plateforme et ses utilisateurs. Ils couvrent les moments critiques du parcours :

1. **Confirmation d'inscription** — rassure le Participant, lui donne les infos pratiques
2. **Confirmation liste d'attente** — informe le Participant de sa position
3. **Promotion liste d'attente** — notifie le Participant qu'une place s'est libérée
4. **Notification Organisateur : nouvelle inscription** — informe l'Organisateur de chaque nouvelle inscription
5. **Notification Organisateur : nouveau commentaire** — informe l'Organisateur quand un Participant commente son événement
6. **Notification Organisateur : nouveau follower** — informe l'Organisateur quand quelqu'un suit sa Communauté (respecte `notifyNewFollower`)
7. **Mise à jour d'événement** — notifie les inscrits quand la date ou le lieu change (`momentUpdate`) + confirme le changement à l'Organisateur (`hostMomentUpdate`)
8. **Annulation d'événement** — notifie tous les inscrits REGISTERED quand un événement est annulé (`momentCancelled`)
9. **Confirmation de création d'événement** — confirme à l'Organisateur que son événement est publié (`hostMomentCreated`)

**Inspiration Luma** : calendar badge (mois + jour), layout clean, CTA visible, footer discret. Adapté au branding The Playground (gradient rose → violet).

---

## Décision architecturale

**Les emails sont envoyés depuis les server actions, PAS depuis les usecases.**

| Aspect | Décision | Raison |
|--------|----------|--------|
| Lieu d'envoi | Server actions (`registration.ts`) | Les usecases restent de la logique métier pure, sans side effects |
| Pattern | Fire-and-forget | Si l'email échoue, l'inscription réussit quand même |
| i18n | Résolution **avant** le fire-and-forget | Évite la perte du contexte de requête Next.js dans le `Promise` détaché |
| Templates | Locale-agnostiques | Tous les textes UI arrivent pré-traduits dans `strings` |

```
Server Action (joinMomentAction)
  → joinMoment usecase (logique pure, retourne résultat)
  → résoudre i18n (getTranslations, getLocale) — dans le flux principal
  → fire-and-forget: sendRegistrationEmails(...).catch(console.error)
  → retourner le résultat au client
```

---

## 10 emails implémentés

| Email | Template | Déclencheur | Destinataire | Pièce jointe .ics |
|-------|----------|-------------|--------------|---------------------|
| Confirmation inscription | `registration-confirmation` | `joinMomentAction` (status = REGISTERED) | Participant | Oui |
| Confirmation liste d'attente | `registration-confirmation` | `joinMomentAction` (status = WAITLISTED) | Participant | Non |
| Promotion liste d'attente | `waitlist-promotion` | `cancelRegistrationAction` (promotedRegistration) | Participant promu | Oui |
| Notification nouvelle inscription | `host-new-registration` | `joinMomentAction` | Chaque Organisateur de la Communauté (sauf self) | Non |
| Notification nouveau commentaire | `host-new-comment` | `addCommentAction` | Chaque Organisateur de la Communauté (sauf commentateur) | Non |
| Notification nouveau follower | `host-new-follower` | `followCircleAction` | Chaque Organisateur de la Communauté (si `notifyNewFollower` activé) | Non |
| Mise à jour d'événement (Participant) | `moment-update` | `updateMomentAction` (si date ou lieu change) | Inscrits REGISTERED | Non |
| Mise à jour d'événement (Organisateur) | `moment-update` (variante host) | `updateMomentAction` (si date ou lieu change) | Organisateur créateur | Non |
| Annulation d'événement | `moment-cancelled` | `cancelMomentAction` | Inscrits REGISTERED | Non |
| Confirmation création d'événement | `host-moment-created` | `createMomentAction` | Organisateur créateur | Non |

**Note** : confirmation inscription et liste d'attente utilisent le même template, différenciés par les `strings` i18n.

---

## Architecture hexagonale

### Port : `EmailService`

```
src/domain/ports/services/email-service.ts
```

```typescript
export interface EmailService {
  sendRegistrationConfirmation(data: RegistrationConfirmationEmailData): Promise<void>;
  sendWaitlistPromotion(data: WaitlistPromotionEmailData): Promise<void>;
  sendHostNewRegistration(data: HostNewRegistrationEmailData): Promise<void>;
  sendHostNewComment(data: HostNewCommentEmailData): Promise<void>;
  sendHostNewFollower(data: HostNewFollowerEmailData): Promise<void>;
  sendMomentUpdate(data: MomentUpdateEmailData): Promise<void>;
  sendMomentCancelled(data: MomentCancelledEmailData): Promise<void>;
  sendHostMomentCreated(data: HostMomentCreatedEmailData): Promise<void>;
}
```

**Types des payloads** :

- `RegistrationConfirmationEmailData` : `to`, `playerName`, `momentTitle`, `momentSlug`, `momentDate` (formaté), `momentDateMonth`/`momentDateDay` (calendar badge), `locationText`, `circleName`, `circleSlug`, `status` (REGISTERED/WAITLISTED), `icsContent?` (attachement .ics, REGISTERED uniquement), `strings`
- `WaitlistPromotionEmailData` : même structure sans `status`, avec `icsContent?` (promu = confirmé)
- `HostNewRegistrationEmailData` : `to`, `hostName`, `playerName`, `momentTitle`, `momentSlug`, `circleSlug`, `registrationInfo` (pré-formaté), `strings`
- `HostNewCommentEmailData` : `to`, `hostName`, `playerName`, `momentTitle`, `momentSlug`, `circleSlug`, `commentPreview` (max 200 chars, tronqué avec ellipse), `strings`

Tous les payloads contiennent un objet `strings` avec les textes UI pré-traduits → templates locale-agnostiques.

### Adapter : `ResendEmailService`

```
src/infrastructure/services/email/resend-email-service.ts
```

- Utilise `AUTH_RESEND_KEY` (partagée avec Auth.js pour les magic links)
- Sender : `EMAIL_FROM` → `AUTH_EMAIL_FROM` → `onboarding@resend.dev` (fallback chain)
- URLs : `NEXT_PUBLIC_APP_URL` → `http://localhost:3000` (fallback)
- Rend les templates react-email en React via `resend.emails.send({ react: <Template /> })`
- Attache le `.ics` en base64 avec `contentType: "text/calendar; method=PUBLISH"` quand présent

### Export

```
src/infrastructure/services/index.ts → export { createResendEmailService }
```

---

## Pièce jointe .ics (iCalendar)

### Générateur

```
src/infrastructure/services/email/generate-ics.ts
```

Fonction pure générant un fichier iCalendar conforme RFC 5545 :

- `UID` : `{momentId}@theplayground`
- `ORGANIZER` : nom du Circle, `MAILTO:noreply@theplayground.community`
- `DTEND` fallback : `startsAt + 2h` si `endsAt` est `null`
- Échappement des caractères spéciaux (`;`, `,`, `\n`, `\`)
- Terminaisons de ligne CRLF (`\r\n`) — obligatoire RFC 5545
- `DTSTAMP` : horodatage de génération
- `METHOD:PUBLISH`, `STATUS:CONFIRMED`

### Quand attacher le .ics

| Situation | .ics attaché ? | Raison |
|-----------|---------------|--------|
| Inscription confirmée (REGISTERED) | Oui | Le Participant a sa place, l'événement est dans son agenda |
| Liste d'attente (WAITLISTED) | Non | Le Participant n'a pas encore sa place |
| Promotion (WAITLISTED → REGISTERED) | Oui | La place est maintenant confirmée |
| Notification Organisateur | Non | L'Organisateur n'a pas besoin d'ajouter l'événement (il l'a créé) |

### Tests

```
src/infrastructure/services/email/__tests__/generate-ics.test.ts
```

10 tests couvrant : structure iCal, détails événement, terminaisons CRLF, date de fin fallback, échappement de 4 types de caractères spéciaux (`;`, `,`, `\n`, `\`), `DTSTAMP`.

---

## Templates email

### Composants partagés

#### `EmailLayout`

```
src/infrastructure/services/email/templates/components/email-layout.tsx
```

- Body : gris clair `#f4f4f5`
- Container : blanc, `max-width: 520px`, `border-radius: 12px`
- Footer : "Powered by The Playground" avec lien vers la homepage
- Inline styles partout (compatibilité email clients)

#### `CalendarBadge`

```
src/infrastructure/services/email/templates/components/calendar-badge.tsx
```

Badge date inspiré Luma, adapté branding :
- Gradient `#ec4899` → `#8b5cf6` (rose → violet)
- `64×64px`, `border-radius: 12px`
- Mois en haut (petit, blanc, uppercase), jour en dessous (gros, blanc, bold)

### Template : Confirmation inscription / liste d'attente

```
src/infrastructure/services/email/templates/registration-confirmation.tsx
```

Structure :
1. Calendar badge (mois + jour)
2. Heading (ex: "Inscription confirmée !" / "Vous êtes sur la liste d'attente")
3. Message de statut (ex: "Vous êtes inscrit(e) à {momentTitle}")
4. Méta : date + lieu (avec icônes textuelles)
5. CTA bouton rose : "Voir l'événement" → `/m/[slug]`
6. Lien d'annulation (petit, gris) → `/m/[slug]`
7. Footer

### Template : Promotion liste d'attente

```
src/infrastructure/services/email/templates/waitlist-promotion.tsx
```

Même structure que la confirmation, textes spécifiques : "Bonne nouvelle ! Une place s'est libérée."
Pas de lien d'annulation.

### Template : Notification Organisateur — nouvelle inscription

```
src/infrastructure/services/email/templates/host-new-registration.tsx
```

Plus simple :
1. Heading : "Nouvelle inscription"
2. Message : "{playerName} a rejoint {momentTitle}" (via `strings.message`, locale-agnostique)
3. Badge stats : "{count} inscrits / {capacity} places" ou "{count} inscrits"
4. CTA : "Gérer les inscriptions" → `/dashboard/circles/[circleSlug]/moments/[momentSlug]`
5. Footer

### Template : Notification Organisateur — nouveau commentaire

```
src/infrastructure/services/email/templates/host-new-comment.tsx
```

1. Heading : "Nouveau commentaire"
2. Message : "{playerName} a commenté votre événement {momentTitle}" (via `strings.message`)
3. Aperçu du commentaire (max 200 chars, tronqué)
4. CTA : "Voir le commentaire" → `/dashboard/circles/[circleSlug]/moments/[momentSlug]`
5. Footer

---

## Wiring dans les server actions

### `joinMomentAction` (`src/app/actions/registration.ts`)

Après `joinMoment(...)` réussi :
1. Résoudre `getTranslations("Email")` + `getLocale()` dans le flux principal
2. Fire-and-forget : `sendRegistrationEmails(momentId, userId, registration, t, locale).catch(console.error)`
3. Retourner le résultat normalement

`sendRegistrationEmails(...)` :
1. Fetch enrichissement : `userRepository.findById`, `momentRepository.findById`, `circleRepository.findById`
2. Formater dates avec `date-fns` (locale FR ou EN via `getDateFnsLocale`)
3. Formater lieu avec `formatLocationText` (ONLINE → "En ligne"/"Online", sinon nom + adresse)
4. Générer `.ics` si REGISTERED (pas WAITLISTED)
5. Envoyer confirmation au Participant
6. Fetch Organisateurs de la Communauté (`findMembersByRole(circleId, "HOST")`)
7. Compter les inscrits REGISTERED
8. Envoyer notification à chaque Organisateur (skip si Organisateur = Participant inscrit)

### `cancelRegistrationAction` (`src/app/actions/registration.ts`)

Si `result.promotedRegistration` existe :
1. Résoudre `getTranslations("Email")` + `getLocale()` dans le flux principal
2. Fire-and-forget : `sendPromotionEmail(promotedRegistration, t, locale).catch(console.error)`

`sendPromotionEmail(...)` :
1. Fetch enrichissement (user, moment, circle)
2. Formater dates et lieu
3. Générer `.ics` (promu = confirmé)
4. Envoyer email de promotion

### `addCommentAction` (`src/app/actions/comment.ts`)

Après `addComment(...)` réussi :
1. Résoudre `getTranslations("Email")` + `getLocale()` dans le flux principal
2. Fire-and-forget : `sendHostCommentNotification(momentId, userId, content, t, locale).catch(console.error)`

`sendHostCommentNotification(...)` :
1. Fetch commenter (userRepository) + moment (momentRepository) en parallèle
2. Fetch circle séquentiellement (dépend de `moment.circleId`)
3. Tronquer le commentaire à 200 chars si nécessaire
4. Fetch Organisateurs de la Communauté (`findMembersByRole(circleId, "HOST")`)
5. Envoyer notification à chaque Organisateur (skip si Organisateur = commentateur)

---

## i18n

### Namespace `"Email"` — Clés

| Clé | FR | EN |
|-----|----|----|
| `registration.subject` | Inscription confirmée : {momentTitle} | You've joined {momentTitle} |
| `registration.heading` | Inscription confirmée ! | Registration confirmed! |
| `registration.statusMessage` | Vous êtes inscrit(e) à {momentTitle}. | You've joined {momentTitle}. |
| `waitlist.subject` | Liste d'attente : {momentTitle} | Waitlist: {momentTitle} |
| `waitlist.heading` | Vous êtes sur la liste d'attente | You're on the waitlist |
| `waitlist.statusMessage` | Vous êtes en liste d'attente pour {momentTitle}. Nous vous informerons si une place se libère. | You're on the waitlist for {momentTitle}. We'll let you know if a spot opens up. |
| `promotion.subject` | Votre place est confirmée : {momentTitle} | Your spot is confirmed: {momentTitle} |
| `promotion.heading` | Bonne nouvelle ! | Great news! |
| `promotion.statusMessage` | Une place s'est libérée ! Votre inscription à {momentTitle} est confirmée. | A spot opened up! Your registration for {momentTitle} is confirmed. |
| `hostNotification.subject` | {playerName} s'est inscrit(e) à {momentTitle} | {playerName} joined {momentTitle} |
| `hostNotification.heading` | Nouvelle inscription | New registration |
| `hostNotification.message` | {playerName} s'est inscrit(e) à {momentTitle} | {playerName} joined {momentTitle} |
| `hostNotification.registrationInfo` | {count} inscrit(s) / {capacity} places | {count} joined / {capacity} spots |
| `hostNotification.registrationInfoUnlimited` | {count} inscrit(s) | {count} joined |
| `hostNotification.manageRegistrationsCta` | Gérer les inscriptions | Manage registrations |
| `commentNotification.subject` | {playerName} a commenté {momentTitle} | {playerName} commented on {momentTitle} |
| `commentNotification.heading` | Nouveau commentaire | New comment |
| `commentNotification.message` | {playerName} a commenté votre événement {momentTitle} | {playerName} commented on your Event {momentTitle} |
| `commentNotification.commentPreviewLabel` | Commentaire | Comment |
| `commentNotification.viewCommentCta` | Voir le commentaire | View comment |
| `common.dateLabel` | Date | Date |
| `common.locationLabel` | Lieu | Location |
| `common.viewMomentCta` | Voir l'événement | View Event |
| `common.cancelLink` | Annuler mon inscription | Cancel my registration |
| `common.footer` | Powered by The Playground — Lancez votre communauté, gratuitement. | Powered by The Playground — Launch your community, for free. |

---

## Configuration

### Variables d'environnement

| Variable | Statut | Usage |
|----------|--------|-------|
| `AUTH_RESEND_KEY` | Existante | Clé API Resend (partagée auth + transactionnel) |
| `EMAIL_FROM` | Ajoutée | Sender : `The Playground <noreply@the-playground.fr>` |
| `NEXT_PUBLIC_APP_URL` | Existante | URL de base pour les liens dans les emails |

### DNS (OVH pour the-playground.fr)

| Type | Name | Value | Usage |
|------|------|-------|-------|
| TXT | `resend._domainkey` | DKIM public key (fournie par Resend) | Authentification DKIM |
| MX | `send` | `feedback-smtp.eu-west-1.amazonses.com` (prio 10) | SPF — sous-domaine d'envoi |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | SPF |
| TXT | `_dmarc` | `v=DMARC1; p=none;` | DMARC (mode monitoring) |

### Domaine Resend

- Domaine vérifié : `the-playground.fr`
- Sous-domaine d'envoi : `send.the-playground.fr` (configuré automatiquement par Resend)
- Sender : `noreply@the-playground.fr`

---

## Cas particulier : auto-inscription Organisateur

Quand un Organisateur crée un événement, il est automatiquement inscrit (REGISTERED) dans le usecase `createMoment`. Cette inscription se fait directement en base, **sans passer par `joinMomentAction`**, donc **aucun email n'est envoyé** à l'Organisateur pour sa propre inscription. C'est le comportement souhaité — l'Organisateur sait qu'il est inscrit puisqu'il vient de créer l'événement.

---

## Fichiers

### Nouveaux (16)

| Fichier | Rôle |
|---------|------|
| `src/domain/ports/services/email-service.ts` | Port EmailService (interface + types) |
| `src/infrastructure/services/email/resend-email-service.ts` | Adapter Resend |
| `src/infrastructure/services/email/generate-ics.ts` | Générateur iCalendar (.ics) |
| `src/infrastructure/services/email/templates/components/email-layout.tsx` | Layout de base |
| `src/infrastructure/services/email/templates/components/calendar-badge.tsx` | Badge date (gradient) |
| `src/infrastructure/services/email/templates/registration-confirmation.tsx` | Confirmation inscription/liste d'attente |
| `src/infrastructure/services/email/templates/waitlist-promotion.tsx` | Promotion liste d'attente |
| `src/infrastructure/services/email/templates/host-new-registration.tsx` | Notification Organisateur — nouvelle inscription |
| `src/infrastructure/services/email/templates/host-new-comment.tsx` | Notification Organisateur — nouveau commentaire |
| `src/infrastructure/services/email/templates/host-new-follower.tsx` | Notification Organisateur — nouveau follower |
| `src/infrastructure/services/email/templates/moment-update.tsx` | Mise à jour d'événement (Participant et Organisateur) |
| `src/infrastructure/services/email/templates/moment-cancelled.tsx` | Annulation d'événement |
| `src/infrastructure/services/email/templates/host-moment-created.tsx` | Confirmation création d'événement à l'Organisateur |
| `src/infrastructure/services/email/templates/new-moment-notification.tsx` | Nouvel événement dans une Communauté (membres/followers) |
| `src/infrastructure/services/email/__tests__/generate-ics.test.ts` | Tests unitaires generateIcs (10 tests) |
| `src/domain/usecases/__tests__/helpers/mock-email-service.ts` | Mock pour tests |

### Modifiés (7)

| Fichier | Changement |
|---------|-----------|
| `src/app/actions/registration.ts` | Ajout envoi emails (fire-and-forget) après `joinMoment` et `cancelRegistration` |
| `src/app/actions/comment.ts` | Ajout notification Organisateur (fire-and-forget) après `addComment` |
| `src/app/actions/moment.ts` | Ajout notifications mise à jour, annulation et confirmation création |
| `src/app/actions/circle.ts` | Ajout notification Organisateur après `followCircle` |
| `src/app/actions/notify-new-moment.ts` | Notifications membres et followers à la création d'un événement |
| `messages/fr.json` | Namespace `"Email"` étendu (clés follower, mise à jour, annulation, création) |
| `messages/en.json` | Namespace `"Email"` étendu (clés follower, mise à jour, annulation, création) |

---

## Décisions prises

| Décision | Raison |
|----------|--------|
| Emails depuis server actions, pas usecases | Usecases restent purs, pas de side effects |
| Fire-and-forget | Email fail ≠ inscription fail |
| i18n résolu avant le fire-and-forget | Contexte requête Next.js non disponible dans Promise détachée |
| Templates locale-agnostiques (`strings`) | Un seul template pour toutes les langues |
| Même template pour REGISTERED et WAITLISTED | Seuls les textes changent, structure identique |
| `.ics` attaché seulement pour REGISTERED et promotion | WAITLISTED n'a pas encore de place confirmée |
| `AUTH_RESEND_KEY` partagée (auth + transactionnel) | Même service Resend, pas besoin de clé séparée |
| Pas d'email pour auto-inscription Organisateur | L'Organisateur sait qu'il est inscrit puisqu'il crée l'événement |
| Calendar badge gradient rose→violet | Branding The Playground, inspiré Luma |

---

## Évolutions futures

- Rappel 24h avant l'événement (nécessite jobs planifiés — Phase 2)
- Rappel 1h avant l'événement (nécessite jobs planifiés — Phase 2)
- Communication Organisateur → Participants (email direct groupé — Phase 2)
- Multi-canal (SMS, push, WhatsApp) — même architecture port/adapter (Phase 2)
