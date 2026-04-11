# Emails d'onboarding — Spec

> Série d'emails automatisés envoyés aux nouveaux utilisateurs pour les guider vers l'activation.

---

## Objectif

Transformer un nouvel inscrit en utilisateur actif :

- **Organisateur** : créer sa Communauté → publier son premier événement → obtenir ses premiers inscrits
- **Participant** : découvrir la Communauté qu'il a rejointe → revenir pour le prochain événement → découvrir d'autres Communautés

Métrique de succès : taux d'activation (% d'utilisateurs qui créent une Communauté ou reviennent sur un 2e événement dans les 30 jours).

---

# MVP — 1 email après inscription

> Implémentation ultra-minimale : **un seul email** (la lettre du fondateur) envoyé **après la complétion du profil**, pour les nouveaux utilisateurs uniquement. Pas de parcours A/B, pas de cron, pas de rattrapage des utilisateurs existants, pas de table dédiée.

## Email 1 · Lettre du fondateur

**Déclencheur** : complétion du profil (`completeOnboardingAction` dans `src/app/actions/profile.ts`)
**Mécanisme** : fire-and-forget via `after()`, même endroit que `admin-new-user`
**Expéditeur** : `Dragos · The Playground <dragos@the-playground.fr>`
**Reply-to** : `dragos@the-playground.fr`
**Ton** : personnel, tutoiement, lettre d'humain à humain — voir `spec/mkt/emails/onboarding-1-lettre-fondateur.md` pour le contenu exact (objet, corps, footer RGPD).

> **Pas de CTA bouton** dans l'email — c'est une lettre, pas une landing page. Le seul appel à l'action est implicite : répondre à l'email. La lettre mise sur le lien humain, pas sur la conversion.

---

## Architecture MVP

### Schema Prisma

Un seul champ ajouté sur User — pas de table dédiée :

```prisma
// Ajout dans model User
welcomeEmailSentAt DateTime? @map("welcome_email_sent_at")
```

Ce champ sert d'**idempotence** : si l'email est déjà parti pour un utilisateur, on ne l'envoie pas une seconde fois. En théorie `completeOnboardingAction` ne s'exécute qu'une fois par utilisateur, mais le flag protège contre une double exécution accidentelle (retry, race condition).

### Envoi — fire-and-forget dans `completeOnboardingAction`

Dans `src/app/actions/profile.ts`, ajouter un nouveau bloc `after()` à côté des existants (`admin-new-user`, Slack notification, publicId) :

```typescript
after(async () => {
  // Idempotence : ne pas renvoyer si déjà envoyé (protection contre retry/race)
  if (result.data.welcomeEmailSentAt) return;

  // Exclure les admins — ils ne reçoivent pas la lettre marketing
  if (result.data.role === "ADMIN") return;

  try {
    await emailService.sendOnboardingWelcome({
      to: result.data.email,
      firstName: result.data.firstName,
    });
    await prismaUserRepository.setWelcomeEmailSent(result.data.id);
  } catch (e) {
    Sentry.captureException(e);
  }
});
```

**Notes importantes** :
- Pas de pré-résolution i18n — les strings sont **hardcodés en français** directement dans le template react-email (convention identique à `notifyAdminNewUser` de profile.ts).
- `result.data.welcomeEmailSentAt` est lu directement (pas de nouvelle query DB) — le champ est inclus dans le mapping domain `User` via le repository.
- Le filtre `@test.playground` / `@demo.playground` est automatique via le helper `send()` existant de `ResendEmailService` (`isDemoEmail()`).

### Template

Un seul nouveau template react-email :

```
src/infrastructure/services/email/templates/
  onboarding-welcome.tsx  → Lettre du fondateur
```

### Port EmailService

Ajouter une méthode simple :

```typescript
sendOnboardingWelcome(data: OnboardingWelcomeEmailData): Promise<void>;
```

Avec le type minimal :

```typescript
type OnboardingWelcomeEmailData = {
  to: string;
  firstName: string | null;   // fallback : "à toi" si null (ex: "Bonjour à toi,")
};
```

**Pourquoi aussi minimal ?**
- Le **subject** est hardcodé dans l'adapter : `"The Playground a besoin de toi"`
- Le **contenu de la lettre** (10 paragraphes) est hardcodé dans le template `.tsx` sous forme de JSX. Aucune i18n, aucun passage de strings en props.
- Seule la **salutation** est interpolée côté template : `Bonjour {firstName ?? "à toi"},`
- C'est un email one-shot avec un contenu fixe — inutile de passer un objet `strings` complet pour être "générique".

**Contenu de référence** : `spec/mkt/emails/onboarding-1-lettre-fondateur.md` (structure narrative + footer RGPD).

### Expéditeur dédié

Les emails d'onboarding utilisent une adresse différente du sender transactionnel habituel, pour renforcer l'authenticité de la lettre fondateur :

```
From: Dragos · The Playground <dragos@the-playground.fr>
Reply-To: dragos@the-playground.fr
```

Le sender transactionnel actuel (`EMAIL_FROM="The Playground <noreply@the-playground.fr>"`) reste inchangé pour tous les autres emails (confirmations, rappels, notifications Organisateur, etc.).

**Implémentation dans \****`ResendEmailService`** :

```typescript
function getOnboardingSender(): string {
  return process.env.ONBOARDING_EMAIL_FROM ?? "Dragos · The Playground <dragos@the-playground.fr>";
}

async sendOnboardingWelcome(data: OnboardingWelcomeEmailData): Promise<void> {
  if (isDemoEmail(data.to)) return; // filter test/demo addresses

  await resend.emails.send({
    from: getOnboardingSender(),
    to: data.to,
    replyTo: "dragos@the-playground.fr",
    subject: "The Playground a besoin de toi",
    react: <OnboardingWelcomeEmail firstName={data.firstName} />,
  });
}
```

Le `replyTo` explicite garantit que même si un provider email réécrit le `From`, les réponses partent bien vers la bonne inbox.

### Footer RGPD du template

Le template `onboarding-welcome.tsx` inclut un footer minimal en bas de la lettre :

```
Tu reçois cet email car tu as créé un compte sur The Playground.
[Gérer mes préférences]
```

**Note importante** : **pas de lien "Se désabonner"**. Cet email est un **one-shot relationnel** (envoyé une seule fois lors de la création du compte), pas un email de prospection commerciale récurrente. Selon l'article L34-5 du Code des postes et communications électroniques, il est exempt d'obligation d'opt-out. Afficher un "Se désabonner" serait trompeur : il n'y a rien à désabonner puisque cet email ne sera plus jamais renvoyé (idempotence via `welcomeEmailSentAt`).

Le lien "Gérer mes préférences" pointe vers `/dashboard/profile` où l'utilisateur peut ajuster ses autres préférences de notification.

**À revoir** si un jour on ajoute un deuxième email plateforme (newsletter, email 2 Découvrir, etc.) : il faudra alors ajouter un flag `notifyPlatform` sur User et un vrai lien "Se désabonner". Pour l'instant, **YAGNI**.

### Checklist de configuration (à faire avant le déploiement)

**Variables d'environnement** :

- [ ] Ajouter dans `.env.local` (dev) :
```
  ONBOARDING_EMAIL_FROM="Dragos · The Playground <dragos@the-playground.fr>"
```
- [ ] Ajouter la même variable dans **Vercel** (Production + Preview) via le dashboard Project Settings → Environment Variables

**Configuration DNS / Resend** :

- [ ] Vérifier dans le dashboard Resend que le domaine `the-playground.fr` est bien vérifié (SPF, DKIM, DMARC). Le domaine est déjà utilisé par `noreply@the-playground.fr`, donc la vérification est normalement déjà OK — à confirmer.
- [ ] Aucune action DNS supplémentaire nécessaire si le domaine est vérifié : Resend permet d'envoyer depuis n'importe quelle adresse `*@the-playground.fr` une fois le domaine validé.

**Configuration de la boîte mail \****`dragos@the-playground.fr`** :

- [ ] Créer l'alias ou la boîte mail `dragos@the-playground.fr` chez le registrar DNS ou le provider email du domaine
- [ ] Configurer un **forward** vers l'inbox personnelle du fondateur (Gmail ou autre), pour que les réponses arrivent en temps réel
- [ ] Tester le forward : envoyer un email depuis un compte externe vers `dragos@the-playground.fr` et vérifier la réception dans l'inbox personnelle
- [ ] **Optionnel** : configurer aussi l'envoi depuis cette adresse pour permettre au fondateur de répondre directement depuis `dragos@the-playground.fr` (et non depuis son adresse perso)

**Vérification en production** :

- [ ] Après déploiement, créer un compte de test et compléter le profil
- [ ] Vérifier la réception de l'email à l'adresse du compte test :
  - L'expéditeur affiché est bien "Dragos · The Playground"
  - L'adresse est bien `dragos@the-playground.fr`
  - Répondre à l'email arrive dans l'inbox du fondateur
  - Pas de warning SPF/DKIM dans l'email reçu (vérifier dans les headers Gmail)

### Hexagonale — Découpage

| Couche | Fichier | Responsabilité |
| --- | --- | --- |
| **Domain** | `domain/ports/services/email-service.ts` | Ajout de `sendOnboardingWelcome` au port + type `OnboardingWelcomeEmailData` |
| **Domain** | `domain/ports/repositories/user-repository.ts` | Ajout de `setWelcomeEmailSent(userId)` |
| **Infra** | `infrastructure/repositories/prisma-user-repository.ts` | Implémentation de `setWelcomeEmailSent` |
| **Infra** | `infrastructure/services/email/templates/onboarding-welcome.tsx` | Template react-email |
| **Infra** | `infrastructure/services/email/resend-email-service.ts` | Implémentation de `sendOnboardingWelcome` + `getOnboardingSender()` |
| **App** | `app/actions/profile.ts` | Nouveau bloc `after()` dans `completeOnboardingAction` |

### Exclusions

- Emails `@test.playground` et `@demo.playground` (filtre existant dans `ResendEmailService`)
- Utilisateurs admin (`role: ADMIN`) — optionnel, à documenter comme règle produit si on les exclut explicitement
- Utilisateurs avec `onboardingCompleted = false` (par construction — l'email ne part que depuis `completeOnboardingAction` qui marque `onboardingCompleted = true`)

### Observabilité

- **Sentry** : les erreurs d'envoi sont capturées (non bloquantes, fire-and-forget)
- **Prisma Studio** : le champ `welcomeEmailSentAt` est consultable pour vérifier qui a reçu l'email
- **Resend dashboard** : permet de voir les logs d'envoi, taux de délivrance, taux d'ouverture natif

### Plan d'implémentation

| Étape | Contenu |
| --- | --- |
| 1 | Schema Prisma : ajouter `welcomeEmailSentAt` sur User + `pnpm db:push` dev/prod |
| 2 | Port `EmailService` : ajouter `sendOnboardingWelcome` + types |
| 3 | Repository `UserRepository` : ajouter `setWelcomeEmailSent` + impl Prisma |
| 4 | Template react-email `onboarding-welcome.tsx` (contenu depuis `spec/mkt/emails/onboarding-1-lettre-fondateur.md`) |
| 5 | Adapter `ResendEmailService` : implémenter `sendOnboardingWelcome` + `getOnboardingSender()` |
| 6 | Wire-up dans `completeOnboardingAction` : nouveau bloc `after()` avec idempotence |
| 7 | Config externe : variable `ONBOARDING_EMAIL_FROM`, alias DNS `dragos@the-playground.fr`, forward Gmail |
| 8 | Test manuel : créer un compte test, compléter le profil, vérifier réception |

> **Pas d'i18n** : le contenu de la lettre du fondateur est hardcodé en français dans le template (même convention que `notifyAdminNewUser`). C'est une lettre d'humain à humain, pas du contenu applicatif — elle ne sera traduite que si on ouvre au marché EN.

Pas de tests unitaires spécifiques pour cette feature (trop simple — c'est un fire-and-forget qui lit un flag et envoie via Resend). Les tests E2E existants sur `completeOnboardingAction` couvrent déjà le flow de complétion du profil.

---

## Backfill des utilisateurs existants — script one-shot

L'email applicatif ne part que pour les nouveaux utilisateurs via `after()` dans `completeOnboardingAction`. Pour les utilisateurs déjà inscrits, on envoie la lettre via un **script one-shot manuel** exécuté une seule fois après le déploiement.

### Cutoff : utilisateurs inscrits **après le 12/03/2026**

Le 12/03/2026, une campagne Brevo a envoyé la **lettre ambassadeur** (contenu très proche de la lettre du fondateur qu'on s'apprête à envoyer) à tous les utilisateurs existants à ce moment-là. Les users inscrits **avant** le 12/03 ont donc déjà reçu ce message et ne doivent **pas** être recontactés.

> Une seconde campagne Brevo a été envoyée le 18/03 mais il s'agissait de la **newsletter produit** (`2026-03-nouveautes-v1.5-v1.16.md`) — contenu différent, pas de risque de doublon. Les users inscrits entre le 12/03 et le 17/03 n'ont reçu que cette newsletter produit, pas la lettre fondateur. Ils sont donc **à inclure** dans le backfill.

**Volume attendu** : ~32 utilisateurs bruts (mesuré le 2026-04-11), à diminuer de 6 exclusions manuelles → **\~26 envois réels**.

### Exclusions manuelles

Liste codée en dur au début du script. Ces comptes apparaissent dans la base mais ne doivent pas recevoir la lettre :

```typescript
const EXCLUDED_EMAILS = [
  "dragos.dreptate@gmail.com",   // fondateur principal
  "dragos@thespark.fr",          // alt fondateur
  "darie.dreptate@gmail.com",    // famille
  "swykin.ed@gmail.com",         // famille (Edouard Dreptate)
  "ddreptate@mailinator.com",    // test throwaway
  "testeric@yopmail.com",        // test throwaway
];
```

### Script

`scripts/send-onboarding-welcome-backfill.ts`

Requête de ciblage :

```typescript
const BREVO_FOUNDER_LETTER_DATE = new Date("2026-03-12T00:00:00Z");

const users = await prisma.user.findMany({
  where: {
    onboardingCompleted: true,
    welcomeEmailSentAt: null,                        // pas encore envoyé via l'app
    createdAt: { gte: BREVO_FOUNDER_LETTER_DATE },   // après la campagne Brevo
    email: { notIn: EXCLUDED_EMAILS },
    AND: [
      { email: { not: { endsWith: "@test.playground" } } },
      { email: { not: { endsWith: "@demo.playground" } } },
    ],
  },
  select: { id: true, email: true, firstName: true, createdAt: true },
  orderBy: { createdAt: "asc" },
});
```

### Modes d'exécution

- **`--dry-run`** (défaut) : affiche la liste des destinataires, ne fait rien
- **`--execute`** : envoie vraiment les emails via `emailService.sendOnboardingWelcome` + marque `welcomeEmailSentAt = now` pour chaque envoi
- **Throttling** : 1 email toutes les 1-2 secondes pour rester sous la limite Resend (pas de batch — la lettre est personnalisée)
- **Idempotent** : safe à relancer — les users avec `welcomeEmailSentAt IS NOT NULL` sont filtrés

### Commandes pnpm

```bash
# Dev (dry-run par défaut)
pnpm db:send-onboarding-welcome-backfill

# Dev réel
pnpm db:send-onboarding-welcome-backfill --execute

# Prod (dry-run par défaut, avec bash wrapper qui fetch le connection string)
pnpm db:send-onboarding-welcome-backfill:prod

# Prod réel (avec double confirmation dans le wrapper bash)
pnpm db:send-onboarding-welcome-backfill:prod --execute
```

### Ordre d'exécution recommandé

1. Déployer le code applicatif (MVP : `after()` + templates + config)
2. Valider que l'envoi marche pour un nouvel utilisateur (créer un compte test en prod)
3. Lancer le backfill en `--dry-run` pour vérifier la liste
4. Lancer le backfill en `--execute` en prod

---

## Autres hors scope MVP

- **Email 2 (Découvrir les communautés)** — preuve sociale à J+3 via cron. Déplacé dans le plan V2 ci-dessous.
- **Désinscription spécifique onboarding** — pour l'instant, l'unique email ne justifie pas un flag `notifyOnboarding` dédié. Le footer RGPD pointe vers les préférences existantes et la désinscription plateforme. À rajouter si on ajoute d'autres emails onboarding.

---

# Plan complet V2 — Série segmentée (9 emails, 2 parcours)

> Cette section décrit l'évolution future vers une série complète avec parcours Organisateur/Participant. À implémenter quand le MVP (1 email) est en production et les premiers retours collectés.

## Prérequis pour passer en V2

- MVP en production depuis > 4 semaines
- Retours utilisateurs sur la lettre du fondateur (via reply-to `dragos@the-playground.fr`)
- Données d'activation disponibles (combien créent une Communauté, combien reviennent)
- Décision sur la pertinence de segmenter (si 90% des utilisateurs sont des Participants, le parcours A a peu de volume)
- **Si on ajoute au moins 1 email supplémentaire après l'email 1**, le champ unique `welcomeEmailSentAt` sur User devient insuffisant — basculer vers une table `onboarding_emails` avec enums `OnboardingStep` / `OnboardingEmailStatus` (schéma détaillé dans la section "Modèle de données V2" ci-dessous).

## Deux parcours

Un utilisateur entre dans The Playground par l'un de ces deux chemins :

| Parcours | Déclencheur | Détection |
| --- | --- | --- |
| **Organisateur** | Inscription directe (landing page, dashboard) | `user.createdAt` récent + aucune `Registration` existante |
| **Participant** | Inscription à un événement via lien partagé | `user.createdAt` récent + au moins une `Registration` existante |

La détection se fait au moment du premier passage du cron, en regardant l'état de l'utilisateur. Pas de flag explicite "je suis organisateur" — on infère du comportement.

> **Cas particulier** : un utilisateur qui s'inscrit directement puis rejoint un événement avant le J+1 bascule naturellement vers le parcours Participant (il a une Registration). C'est le bon comportement — s'il a rejoint un événement, le parcours Participant centré sur la Communauté est plus pertinent.

> **Pas de changement de parcours en cours de séquence.** Une fois le parcours déterminé (au premier passage du cron après A1), l'utilisateur reste sur ce parcours jusqu'à la fin. B4 gère déjà la conversion Participant → Organisateur.

```typescript
function getOnboardingPath(user: User, registrationCount: number): "A" | "B" {
  // Un utilisateur qui a au moins une inscription à un événement est un Participant.
  // Peu importe comment il est arrivé — s'il a rejoint un événement, le parcours B
  // (centré Communauté/rétention) est le plus pertinent.
  if (registrationCount > 0) return "B";
  return "A";
}
```

---

## Parcours A — Organisateur

### A1 · Bienvenue (J+0, après complétion du profil)

**Sujet** : Bienvenue sur The Playground
**Déclencheur** : complétion du profil utilisateur (fire-and-forget via `after()` depuis `completeOnboardingAction` dans `src/app/actions/profile.ts`, même endroit que `admin-new-user`)
**Reply-to** : adresse du fondateur (tous les emails de la série)

> **Pourquoi pas à la création du compte ?** Auth.js v5 n'a pas d'événement `createUser`. Le compte est créé silencieusement par le `PrismaAdapter`. C'est `completeOnboardingAction()` qui marque le vrai "J+0" — à ce stade l'utilisateur a renseigné son prénom, on peut personnaliser l'email.

**Contenu** :
- Ton fondateur, chaleureux, direct
- "Bienvenue [prénom]. The Playground, c'est la plateforme gratuite pour créer des communautés qui durent — pas juste des événements."
- Rappel du positionnement : "Ici, votre communauté vous appartient — vos membres, vos données, toujours."
- Mention : 100% gratuit, pas de piège, pas de commission
- "Répondez à cet email si vous avez la moindre question — je lis tout personnellement."
- **CTA** : Découvrir The Playground → `/dashboard`

> **Pourquoi pas de CTA "Créer votre Communauté" ?** Cet email part pour TOUS les nouveaux utilisateurs (le parcours A/B n'est pas encore déterminé à J+0). Un Participant qui vient de s'inscrire à un événement n'a pas besoin de créer une Communauté. Le contenu est centré sur la **motivation** (pourquoi The Playground existe) et non sur les **étapes** (déjà couvertes par le guide in-app `OrganizerOnboardingGuide` visible sur le dashboard).

---

### A2 · Votre Communauté est prête — et maintenant ? (J+3)

**Sujet** : Votre Communauté est prête (ou : 2 minutes pour créer votre Communauté)
**Condition** : parcours Organisateur (pas de Registration)
**Variante** : contenu adapté selon que la Communauté est créée ou non (pas un skip — toujours envoyé)

> **Pourquoi J+3 et pas J+1 ?** À J+1, l'utilisateur n'a souvent pas encore eu le temps de revenir sur la plateforme. J+3 laisse le temps d'explorer par soi-même avant le premier nudge.

**Contenu si Communauté créée** :
- Félicitation : "Votre Communauté [nom] est en ligne !"
- Expliquer le pouvoir de la page Communauté : prochains événements, membres, identité pérenne
- "Un événement isolé, ça s'oublie. Une Communauté avec ses membres et ses rendez-vous, ça dure."
- **CTA** : Créer votre premier événement → `/dashboard/circles/[slug]/moments/new`

**Contenu si pas de Communauté créée** :
- Ton doux, pas culpabilisant : "2 minutes suffisent pour créer votre Communauté"
- Rappel des bénéfices : page publique, membres persistants, événements rattachés
- **CTA** : Créer votre Communauté → `/dashboard/circles/new`

---

### A3 · Le secret : un événement suffit (J+5)

**Sujet** : Un événement suffit pour lancer votre communauté
**Condition** : parcours Organisateur
**Variante** : contenu adapté selon qu'un événement PUBLISHED existe ou non (pas un skip — toujours envoyé)

> **Pourquoi ne pas skipper si l'événement existe ?** Les templates de partage sont la partie la plus précieuse de cet email. C'est justement quand l'organisateur a un événement publié qu'il en a le plus besoin.

**Contenu si pas d'événement publié** :
- Expliquer le mécanisme viral : "Quand quelqu'un s'inscrit à votre événement, il devient automatiquement membre de votre Communauté. Un seul événement suffit pour amorcer la machine."
- **CTA** : Publier votre événement → `/dashboard`

**Contenu si événement publié** :
- Féliciter : "Votre événement [titre] est en ligne !"
- "Maintenant, partagez-le. Chaque inscription amène un nouveau membre dans votre Communauté."

**Bloc commun (toujours présent)** — Templates de partage prêts à copier :
- **WhatsApp/SMS** : `🎯 [Titre] · 📅 [Date] · 📍 [Lieu] · Inscription gratuite : [lien]`
- **LinkedIn** : `[Titre] — [Date]. [2 phrases de valeur]. Places limitées : [lien]`
- **Slack/Discord** : `Prochain événement [Communauté] : **[Titre]** — [Date], [Lieu] → [lien]`

> **Note** : si un événement PUBLISHED existe, les templates sont pré-remplis avec les données réelles (titre, date, lieu, lien `/m/[slug]`). Sinon, les placeholders restent en exemple.

---

### A4 · 3 choses que les meilleurs organisateurs font (J+10)

**Sujet** : 3 choses que font les meilleurs organisateurs
**Condition** : parcours Organisateur

**Contenu** :
- Tips actionnables, ton conseil entre pairs (pas cours magistral) :
  1. **Soignez la page de votre Communauté** — ajoutez une description claire et une image de couverture. C'est la première chose que vos futurs membres verront.
  2. **Utilisez le broadcast** pour garder le lien entre deux événements — depuis la page de votre événement, envoyez un message à tous les inscrits. Un rappel, un lien utile, un remerciement — un message suffit pour rappeler que la Communauté existe.
  3. **Exportez vos membres régulièrement** — c'est votre audience, pas la nôtre. CSV disponible en un clic depuis le tableau de bord de votre Communauté.
- **CTA** : Accéder à votre tableau de bord → `/dashboard`

> **Pourquoi pas "Publiez le prochain événement le jour même du précédent" ?** À J+10, la plupart des organisateurs n'ont pas encore eu leur premier événement. Ce tip sera plus pertinent dans un email post-premier-événement (évolution future).

---

### A5 · Vous n'êtes pas seul (J+14)

**Sujet** : Un message personnel
**Condition** : parcours Organisateur

**Contenu** :
- Ton personnel du fondateur (style lettre ambassadeur existante)
- "Je lis tout, je réponds à tout. The Playground est encore jeune, et chaque retour compte."
- Inviter à répondre directement à l'email
- Mentionner la page Découvrir : "D'autres communautés sont déjà actives — allez voir ce qu'elles construisent, ça peut inspirer."
- Pas de CTA commercial — juste du lien humain
- **CTA** : Répondre à cet email

---

## Parcours B — Participant

### B1 · Bienvenue dans la Communauté (J+0, intégré à la confirmation)

**Déclencheur** : première inscription à un événement d'un nouvel utilisateur

> B1 n'est **pas un email séparé** — c'est un **bloc additionnel** dans l'email de confirmation d'inscription (`registration-confirmation.tsx`). Un nouvel utilisateur qui s'inscrit reçoit déjà le magic link + la confirmation d'inscription ; ajouter un 3e email serait du spam. On enrichit plutôt la confirmation existante.

**Implémentation** : dans `registration-confirmation.tsx`, ajouter une section conditionnelle (affichée uniquement si `isNewUser = true`) après les détails de l'événement :

**Contenu du bloc additionnel** :
- "Vous êtes maintenant membre de [Communauté] !"
- Présenter la page Communauté : prochains événements, autres membres, identité
- "Après l'événement, la Communauté reste. Vous serez informé des prochains rendez-vous."
- **CTA secondaire** : Voir la page Communauté → `/circles/[slug]`

**Détection \****`isNewUser`** : dans `sendRegistrationEmails()`, vérifier `user.createdAt` < 5 minutes. Le user est déjà chargé dans cette fonction — pas de requête supplémentaire.

---

### B2 · L'événement est passé — et après ? (J+1 après l'événement)

**Sujet** : L'événement [titre] — et après ?
**Timing** : 24h après la date de fin de l'événement (pas J+X après inscription)

> **Architecture** : B2 ne suit pas le modèle séquentiel des autres steps (basé sur `user.createdAt + delayHours`). Son timing dépend de `moment.startsAt`, pas de la date d'inscription. Il est traité comme un **cas spécial** dans le cron : requête dédiée "utilisateurs du parcours B dont le premier événement est passé depuis > 24h et B2 pas encore envoyé". Voir la section "Algorithme du cron" pour le détail.

**Condition** : parcours Participant + l'événement est passé depuis > 24h + B2 pas encore envoyé
**Reporter si** : l'événement n'est pas encore passé (ne pas skip — attendre)
**Skip si** : l'événement a lieu plus de 30 jours après l'inscription de l'utilisateur (au-delà, l'email perd sa valeur d'onboarding)

> **Évolution future** : B2 a vocation à devenir un email transactionnel post-événement envoyé à TOUS les participants (pas seulement les nouveaux). C'est une feature email à part entière, indépendante de l'onboarding. Pour V1, on le garde dans la séquence d'onboarding pour simplifier.

**Contenu** :
- "L'événement [titre] vient de se terminer."
- Encourager à laisser un commentaire sur la page événement
- Montrer les prochains événements de la Communauté (s'il y en a)
- **CTA principal** : Laisser un commentaire → `/m/[slug]#comments`
- **CTA secondaire** : Voir les prochains événements → `/circles/[slug]`

---

### B3 · Découvrez d'autres communautés (J+7)

**Sujet** : D'autres communautés vous attendent
**Condition** : parcours Participant

**Contenu** :
- "The Playground, c'est plus qu'un événement."
- Montrer des communautés actives concrètes : 2-3 Communautés avec leur nom, catégorie et nombre de membres (sélection statique rafraîchie périodiquement, ou dynamique si faisable — sinon exemples fixes)
- Présenter la page Découvrir : filtrables par thème et localisation
- Ton : invitation à explorer, pas injonction
- **CTA** : Explorer les communautés → `/explorer`

> **Pourquoi du contenu concret ?** Un email qui dit juste "allez sur cette page" n'apporte pas de valeur intrinsèque. Montrer 2-3 communautés réelles donne une raison de cliquer.

---

### B4 · Vous organisez aussi des événements ? (J+14)

**Sujet** : Vous organisez aussi des événements ?
**Condition** : parcours Participant + aucune Communauté créée (pas de `CircleMembership` avec rôle HOST)

**Contenu** :
- Question directe : "Vous organisez des événements ou animez une communauté ?"
- Rappel : 100% gratuit, 2 minutes pour créer sa Communauté, vos membres vous appartiennent
- Ton : suggestion, pas pression
- **CTA** : Créer votre Communauté → `/dashboard/circles/new`

---

## Règles transversales V2

| Règle | Détail |
| --- | --- |
| **Langue** | Français par défaut (pas de locale utilisateur en base). On ajoutera le support EN plus tard. |
| **Anti-spam** | Jamais 2 emails d'onboarding le même jour. Si un transactionnel part (confirmation, rappel 24h), l'onboarding du jour est reporté au lendemain. |
| **Idempotence** | Chaque step est marqué `sentAt` en base. Le cron peut tourner 100 fois, un email ne part qu'une fois. |
| **Skip intelligent** | Si l'utilisateur a déjà fait l'action encouragée, l'email est marqué `skipped` (pas envoyé, mais comptabilisé pour passer au suivant). |
| **Désinscription** | Lien de désinscription dans chaque email. Un champ `notifyOnboarding` dans les préférences utilisateur (default `true`). |
| **Design** | Même design system que les emails transactionnels (gradient rose→violet, conteneur 520px, CalendarBadge si pertinent). |
| **Reply-to** | Adresse du fondateur sur **tous** les emails de la série (early-stage : le volume est faible, chaque réponse est une opportunité de feedback). |
| **Exclusions** | Emails `@test.playground` et `@demo.playground` exclus (comme pour les autres emails). |

---

## Architecture technique V2

### Migration MVP → V2

Au passage en V2, on migre le champ unique `welcomeEmailSentAt` du model User vers la table dédiée `onboarding_emails`. Script de migration :

```sql
INSERT INTO onboarding_emails (id, user_id, step, status, sent_at, created_at)
SELECT gen_random_uuid(), id, 'A1', 'SENT', welcome_email_sent_at, welcome_email_sent_at
FROM users WHERE welcome_email_sent_at IS NOT NULL;
```

Puis supprimer le champ `welcomeEmailSentAt` du User (drop column dans une migration de suivi, après vérification que tous les envois passent par la nouvelle table).

### Modèle de données V2

```prisma
enum OnboardingStep {
  A1
  A2
  A3
  A4
  A5
  B1
  B2
  B3
  B4
}

enum OnboardingEmailStatus {
  SENT
  SKIPPED
}

model OnboardingEmail {
  id        String                @id @default(cuid())
  userId    String
  step      OnboardingStep
  status    OnboardingEmailStatus
  sentAt    DateTime
  createdAt DateTime              @default(now())
  user      User                  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, step])
  @@map("onboarding_emails")
}
```

Ajouts dans `model User` :

```prisma
notifyOnboarding   Boolean @default(true) @map("notify_onboarding")
onboardingEmails   OnboardingEmail[]
```

### Séquence et timing V2

```typescript
// Steps avec timing basé sur user.createdAt + delayHours
const ONBOARDING_STEPS = {
  // Parcours A — Organisateur
  A1: { delayHours: 0,   path: "A", description: "Bienvenue" },            // J+0
  A2: { delayHours: 72,  path: "A", description: "Communauté créée ?" },    // J+3
  A3: { delayHours: 120, path: "A", description: "Publiez/partagez" },      // J+5
  A4: { delayHours: 240, path: "A", description: "Tips organisateur" },     // J+10
  A5: { delayHours: 336, path: "A", description: "Message fondateur" },     // J+14

  // Parcours B — Participant (sauf B2, voir ci-dessous)
  B1: { delayHours: 0,   path: "B", description: "Bienvenue Communauté" },  // J+0
  B3: { delayHours: 168, path: "B", description: "Découvrir" },             // J+7
  B4: { delayHours: 336, path: "B", description: "Devenir organisateur" },  // J+14
} as const;

// B2 a un timing spécial : 24h après la date de l'événement (pas après user.createdAt).
// Il est traité par une requête dédiée dans le cron, pas par le modèle séquentiel ci-dessus.
// Séquence B effective : B1 (J+0) → B2 (J+1 post-événement, max J+30) → B3 (J+7) → B4 (J+14)
// B3/B4 ne sont pas bloqués par B2 — ils se basent sur user.createdAt indépendamment.
// B2 est skippé si l'événement a lieu plus de 30 jours après l'inscription (perte de contexte).
```

### Cron job V2

Nouveau cron Vercel dédié : **`POST /api/cron/send-onboarding`** (POST, comme les crons existants).
Fréquence : **toutes les heures**.
Authentification : `Authorization: Bearer ${CRON_SECRET}` (même pattern que `send-reminders`).

```json
// vercel.json — ajout dans le tableau "crons"
{
  "path": "/api/cron/send-onboarding",
  "schedule": "30 * * * *"
}
```

> Décalé à la minute 30 pour ne pas chevaucher `send-reminders` (minute 0). La section onboarding est retirée de `send-reminders` et migrée vers ce cron dédié.

#### Algorithme du cron V2

```
1. Auth check (Bearer CRON_SECRET) → 401 si invalide

2. Charger les utilisateurs éligibles :
   - createdAt dans les 30 derniers jours
   - notifyOnboarding = true
   - email NOT LIKE '%@test.playground' AND NOT LIKE '%@demo.playground'
   - qui ont des steps non encore envoyés/skippés

3. Pour chaque utilisateur — steps séquentiels (A1→A5 ou B1→B4 sauf B2) :
   a. Déterminer le parcours (A ou B)
   b. Trouver le prochain step non envoyé dans la séquence
   c. Vérifier le délai (user.createdAt + delayHours <= now)
   d. Vérifier la règle anti-spam :
      - Pas d'autre onboarding email envoyé dans les dernières 20h
   e. Évaluer la condition de skip (action déjà faite ?)
   f. Si skip → insérer (userId, step, SKIPPED, now), passer au step suivant
   g. Si envoi → construire l'email, envoyer via Resend, insérer (userId, step, SENT, now)

4. Traitement spécial B2 (post-événement) — requête dédiée :
   - Trouver les utilisateurs parcours B dont :
     - le premier événement inscrit est passé depuis > 24h
     - B2 pas encore envoyé/skippé
     - notifyOnboarding = true
   - Pour chacun : construire l'email avec les données de l'événement passé, envoyer, marquer SENT

5. Réponse JSON : { success, processed, sent, skipped, durationMs }
6. Logger : [send-onboarding] X traités, Y envoyés, Z skippés en Nms
7. En cas d'erreur : Sentry.captureException + réponse 500 (une erreur sur un utilisateur ne bloque pas les autres)
```

#### Conditions de skip par step V2

| Step | Skip si... | Variante si... |
| --- | --- | --- |
| A2 | — (toujours envoyé) | Communauté créée → félicitation + CTA événement. Pas créée → nudge doux + CTA création. |
| A3 | — (toujours envoyé) | Événement PUBLISHED → félicitation + templates pré-remplis. Pas d'événement → encouragement + templates exemples. |
| A4 | — (toujours envoyé) | — |
| A5 | — (toujours envoyé) | — |
| B2 | Événement > 30 jours après inscription (perte de contexte). Reporter si événement pas encore passé. | — |
| B3 | — (toujours envoyé) | — |
| B4 | L'utilisateur a déjà créé une Communauté (rôle HOST quelque part) | — |

### Templates V2

```
onboarding-welcome.tsx           → A1 (bienvenue générique) — réutilisé du MVP
onboarding-community-created.tsx → A2 (félicitation + prochain step)
onboarding-community-nudge.tsx   → A2-bis (rappel doux création)
onboarding-share-event.tsx       → A3 (mécanisme viral + templates partage)
onboarding-tips.tsx              → A4 (3 tips organisateur)
onboarding-founder.tsx           → A5 (lettre fondateur)
onboarding-post-event.tsx        → B2 (post-événement + commentaire)
onboarding-discover.tsx          → Email 2 MVP réutilisé pour B3
onboarding-become-host.tsx       → B4 (conversion organisateur)
```

> **B1** n'a pas de template dédié — c'est une section conditionnelle ajoutée dans `registration-confirmation.tsx` existant (affichée si `isNewUser = true`).

### Hexagonale V2

| Couche | Fichier | Responsabilité |
| --- | --- | --- |
| **Domain** | `domain/models/onboarding-email.ts` | Types : `OnboardingStep`, `OnboardingStatus`, `OnboardingEmail` |
| **Domain** | `domain/ports/repositories/onboarding-email-repository.ts` | Interface : `findPendingUsers()`, `markSent()`, `markSkipped()`, `getCompletedSteps()` |
| **Domain** | `domain/usecases/process-onboarding-emails.ts` | Logique : déterminer parcours, évaluer conditions, décider envoi/skip |
| **Infra** | `infrastructure/repositories/prisma-onboarding-email-repository.ts` | Implémentation Prisma du repository |
| **Infra** | `infrastructure/services/email/templates/onboarding-*.tsx` | Templates react-email (9 fichiers) + modification de `registration-confirmation.tsx` pour B1 |
| **App** | `app/api/cron/send-onboarding/route.ts` | Route cron dédiée |

---

## Cas non couverts (limitations connues)

### Utilisateurs invités à une Communauté (3e chemin d'entrée)

Les utilisateurs invités via `circle-invitation` ont une `CircleMembership` PLAYER mais pas de `Registration`. Ils tombent dans le parcours A (Organisateur), ce qui est incorrect — ils ne sont pas là pour créer leur propre Communauté. Volume très faible pour V1 → ignoré. Évolution future : détecter "a une CircleMembership PLAYER mais pas de Registration" → parcours B.

### Utilisateurs qui ne complètent jamais leur profil

A1 se déclenche à `completeOnboardingAction`. Si un utilisateur crée un compte mais abandonne le formulaire (prénom/nom), il ne reçoit aucun email d'onboarding. C'est un point de drop-off silencieux. Évolution future : email de réactivation "Finalisez votre inscription" — c'est un email de rétention, pas d'onboarding.

---

## Hors scope

- A/B testing sur les sujets ou contenus
- Analytics avancés (taux d'ouverture par step) — Resend fournit un dashboard basique
- Localisation EN (FR par défaut, EN quand on ajoutera `locale` au User)
- Personnalisation dynamique avancée (recommandation de communautés dans B3 basée sur la catégorie)
- Règle anti-spam croisée avec les transactionnels (nécessite un log centralisé des envois)
- Email de réactivation pour profils non complétés
- Parcours dédié pour utilisateurs invités à une Communauté
- B2 en tant qu'email transactionnel post-événement pour tous les participants (pas seulement les nouveaux)
