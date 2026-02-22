# Emails transactionnels — Spec d'implémentation

> Emails envoyés automatiquement lors d'actions clés du parcours Player et Host.
> Architecture : Resend + react-email, fire-and-forget depuis les server actions.
>
> Référence backlog : section "Notifications email"

---

## Vision produit

Les emails transactionnels sont le premier canal de communication entre la plateforme et ses utilisateurs. Ils couvrent les moments critiques du parcours :

1. **Confirmation d'inscription** — rassure le Player, lui donne les infos pratiques
2. **Confirmation liste d'attente** — informe le Player de sa position
3. **Promotion liste d'attente** — notifie le Player qu'une place s'est libérée
4. **Notification Host** — informe le Host de chaque nouvelle inscription

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

## 4 emails MVP

| Email | Template | Déclencheur | Destinataire | Pièce jointe .ics |
|-------|----------|-------------|--------------|---------------------|
| Confirmation inscription | `registration-confirmation` | `joinMomentAction` (status = REGISTERED) | Player | Oui |
| Confirmation liste d'attente | `registration-confirmation` | `joinMomentAction` (status = WAITLISTED) | Player | Non |
| Promotion liste d'attente | `waitlist-promotion` | `cancelRegistrationAction` (promotedRegistration) | Player promu | Oui |
| Notification nouvelle inscription | `host-new-registration` | `joinMomentAction` | Chaque Host du Circle (sauf self) | Non |

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
}
```

**Types des payloads** :

- `RegistrationConfirmationEmailData` : `to`, `playerName`, `momentTitle`, `momentSlug`, `momentDate` (formaté), `momentDateMonth`/`momentDateDay` (calendar badge), `locationText`, `circleName`, `circleSlug`, `status` (REGISTERED/WAITLISTED), `icsContent?` (attachement .ics, REGISTERED uniquement), `strings`
- `WaitlistPromotionEmailData` : même structure sans `status`, avec `icsContent?` (promu = confirmé)
- `HostNewRegistrationEmailData` : `to`, `hostName`, `playerName`, `momentTitle`, `momentSlug`, `circleSlug`, `registrationInfo` (pré-formaté), `strings`

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
| Inscription confirmée (REGISTERED) | Oui | Le Player a sa place, l'événement est dans son agenda |
| Liste d'attente (WAITLISTED) | Non | Le Player n'a pas encore sa place |
| Promotion (WAITLISTED → REGISTERED) | Oui | La place est maintenant confirmée |
| Notification Host | Non | Le Host n'a pas besoin d'ajouter l'événement (il l'a créé) |

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

### Template : Notification Host

```
src/infrastructure/services/email/templates/host-new-registration.tsx
```

Plus simple :
1. Heading : "Nouvelle inscription"
2. Message : "{playerName} a rejoint {momentTitle}" (via `strings.message`, locale-agnostique)
3. Badge stats : "{count} inscrits / {capacity} places" ou "{count} inscrits"
4. CTA : "Gérer les inscriptions" → `/dashboard/circles/[circleSlug]/moments/[momentSlug]`
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
5. Envoyer confirmation au Player
6. Fetch Hosts du Circle (`findMembersByRole(circleId, "HOST")`)
7. Compter les inscrits REGISTERED
8. Envoyer notification à chaque Host (skip si Host = Player inscrit)

### `cancelRegistrationAction` (`src/app/actions/registration.ts`)

Si `result.promotedRegistration` existe :
1. Résoudre `getTranslations("Email")` + `getLocale()` dans le flux principal
2. Fire-and-forget : `sendPromotionEmail(promotedRegistration, t, locale).catch(console.error)`

`sendPromotionEmail(...)` :
1. Fetch enrichissement (user, moment, circle)
2. Formater dates et lieu
3. Générer `.ics` (promu = confirmé)
4. Envoyer email de promotion

---

## i18n

### Namespace `"Email"` — Clés

| Clé | FR | EN |
|-----|----|----|
| `registration.subject` | Vous avez rejoint {momentTitle} | You joined {momentTitle} |
| `registration.heading` | Inscription confirmée ! | Registration confirmed! |
| `registration.statusMessage` | Vous êtes inscrit(e) à {momentTitle}. | You are registered for {momentTitle}. |
| `waitlist.subject` | Liste d'attente : {momentTitle} | Waitlist: {momentTitle} |
| `waitlist.heading` | Vous êtes sur la liste d'attente | You're on the waitlist |
| `waitlist.statusMessage` | Vous êtes en liste d'attente pour {momentTitle}. Nous vous informerons si une place se libère. | You're on the waitlist for {momentTitle}. We'll let you know if a spot opens up. |
| `promotion.subject` | Votre place est confirmée : {momentTitle} | Your spot is confirmed: {momentTitle} |
| `promotion.heading` | Bonne nouvelle ! | Great news! |
| `promotion.statusMessage` | Une place s'est libérée ! Votre inscription à {momentTitle} est confirmée. | A spot opened up! Your registration for {momentTitle} is confirmed. |
| `hostNotification.subject` | {playerName} a rejoint {momentTitle} | {playerName} joined {momentTitle} |
| `hostNotification.heading` | Nouvelle inscription | New registration |
| `hostNotification.message` | {playerName} a rejoint {momentTitle} | {playerName} joined {momentTitle} |
| `hostNotification.registrationInfo` | {count} inscrit(s) / {capacity} places | {count} joined / {capacity} spots |
| `hostNotification.registrationInfoUnlimited` | {count} inscrit(s) | {count} joined |
| `hostNotification.manageRegistrationsCta` | Gérer les inscriptions | Manage registrations |
| `common.dateLabel` | Date | Date |
| `common.locationLabel` | Lieu | Location |
| `common.viewMomentCta` | Voir l'événement | View Moment |
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

## Cas particulier : auto-inscription Host

Quand un Host crée un Moment, il est automatiquement inscrit (REGISTERED) dans le usecase `createMoment`. Cette inscription se fait directement en base, **sans passer par `joinMomentAction`**, donc **aucun email n'est envoyé** au Host pour sa propre inscription. C'est le comportement souhaité — le Host sait qu'il est inscrit puisqu'il vient de créer le Moment.

---

## Fichiers

### Nouveaux (10)

| Fichier | Rôle |
|---------|------|
| `src/domain/ports/services/email-service.ts` | Port EmailService (interface + types) |
| `src/infrastructure/services/email/resend-email-service.ts` | Adapter Resend |
| `src/infrastructure/services/email/generate-ics.ts` | Générateur iCalendar (.ics) |
| `src/infrastructure/services/email/templates/components/email-layout.tsx` | Layout de base |
| `src/infrastructure/services/email/templates/components/calendar-badge.tsx` | Badge date (gradient) |
| `src/infrastructure/services/email/templates/registration-confirmation.tsx` | Confirmation inscription/liste d'attente |
| `src/infrastructure/services/email/templates/waitlist-promotion.tsx` | Promotion liste d'attente |
| `src/infrastructure/services/email/templates/host-new-registration.tsx` | Notification Host |
| `src/infrastructure/services/email/__tests__/generate-ics.test.ts` | Tests unitaires generateIcs (10 tests) |
| `src/domain/usecases/__tests__/helpers/mock-email-service.ts` | Mock pour tests |

### Modifiés (4)

| Fichier | Changement |
|---------|-----------|
| `src/app/actions/registration.ts` | Ajout envoi emails (fire-and-forget) après joinMoment et cancelRegistration |
| `src/infrastructure/services/index.ts` | Export `createResendEmailService` |
| `messages/fr.json` | Ajout namespace `"Email"` (17 clés) |
| `messages/en.json` | Ajout namespace `"Email"` (17 clés) |

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
| Pas d'email pour auto-inscription Host | Le Host sait qu'il est inscrit puisqu'il crée le Moment |
| Calendar badge gradient rose→violet | Branding The Playground, inspiré Luma |

---

## Évolutions futures

- Rappel 24h avant le Moment
- Rappel 1h avant le Moment
- Notification de changement (lieu, horaire)
- Notification d'annulation
- Communication Host → Players (email direct)
- Multi-canal (SMS, push, WhatsApp) — même architecture port/adapter
