# Feature flags — analyse et recommandation

Statut : analyse, non implémenté.
Date : 2026-04-16.

## Contexte

Besoin identifié : pouvoir livrer des implémentations à venir de façon progressive, réversible, et contrôlée, sans bloquer le merge sur la complétude totale d'une fonctionnalité.

Ce document répond à trois questions :

1. Qu'est-ce qu'un feature flag et comment ça fonctionne ?
2. Qu'est-ce que ça implique pour The Playground ?
3. Quels sont les cas limites, notamment vis-à-vis du schéma DB ?

---

## 1. Ce que c'est, simplement

Un feature flag (ou feature toggle) est un interrupteur conditionnel dans le code qui décide à l'exécution si une fonctionnalité est visible ou active, sans redéploiement.

```ts
if (flags.isEnabled("moment.proposed-vote", { userId })) {
  return <VoteUI />
}
return <LegacyUI />
```

Le flag est évalué côté app (via un SDK) en interrogeant un service externe qui héberge la configuration : PostHog, GrowthBook, LaunchDarkly, Unleash, ou une table maison `feature_flags`.

### Les 4 usages classiques

| Usage | Exemple dans The Playground |
|---|---|
| **Release toggle** (livrer du code non fini en prod) | Merger le code vote d'événement progressivement, activer plus tard |
| **Experiment toggle** (A/B test) | Tester deux variantes du CTA "S'inscrire" sur la page événement |
| **Ops toggle** (kill switch) | Désactiver l'envoi d'emails si Resend tombe, sans redéploiement |
| **Permission toggle** (beta privée) | Activer "proposer un événement" pour 10 Organisateurs pilotes |

### Cycle de vie

Un flag a une date de naissance et une date de mort. Les flags qui traînent sont la première source de dette technique dans ce pattern. Règle d'or : on note la date de suppression prévue dès la création.

---

## 2. Ce que ça implique pour The Playground

### Choix recommandé : PostHog Feature Flags

PostHog est déjà installé (client + server). PostHog fournit des feature flags gratuits, avec targeting par utilisateur, pourcentage de rollout, A/B tests, et kill switch. Pas besoin d'ajouter un SaaS supplémentaire.

Implémentation typique, respectant l'architecture hexagonale :

```ts
// domain/ports/services/feature-flag-service.ts
export interface FeatureFlagService {
  isEnabled(key: string, context: { userId?: string }): Promise<boolean>
}

// infrastructure/services/posthog/posthog-feature-flag-service.ts
// adapter PostHog qui implémente le port ci-dessus
```

Port dans `domain/ports/services/`, adapter dans `infrastructure/services/`. Les usecases reçoivent le port par injection, comme pour `EmailService` ou `PaymentService`.

### Ce que ça change dans le workflow

| Domaine | Avant | Avec feature flags |
|---|---|---|
| **Merge** | On merge quand c'est fini et testé | On peut merger du code "inactif en prod" tant que le flag est off |
| **Code** | Un chemin unique par feature | Deux chemins coexistent pendant la bascule |
| **Tests** | Tester la feature | Tester les deux états (flag on et flag off) |
| **Monitoring** | Sentry sur l'app | Sentry tagué avec l'état du flag pour repérer les régressions |
| **Rollback** | Revert et redéploiement | Bascule du flag en quelques secondes |

### Bénéfices pour ce projet

1. **Réduit la pression du merge**. Moins de temps sur de longues branches feature. S'aligne avec la règle projet "toujours une branche, commit dès que propre".
2. **Activation progressive**. Un Organisateur pilote peut tester une fonctionnalité avant tous les autres. Utile vu la taille actuelle de la base utilisateurs : petits cohortes faciles à cibler.
3. **Kill switch**. En cas de bug email, Stripe ou IA en prod, désactivation instantanée sans attendre un redéploiement Vercel.
4. **A/B tests sur la page événement**. C'est l'unité virale : tester le CTA, le placement du social proof, la mise en page mobile.

### Coûts à accepter

1. **Complexité du code**. Chaque flag introduit un `if`, donc deux chemins à maintenir. Plus il y en a, plus ça pèse.
2. **Dette technique silencieuse**. Les flags morts restent. Il faut un registre (fichier `spec/infra/feature-flags-registry.md` avec key, description, date de création, date de mort, responsable, état).
3. **Tests doublés**. Chaque flag doit être testé dans ses deux états. Les tests E2E Playwright doivent savoir forcer un état.
4. **Latence**. Évaluer un flag côté serveur est un appel réseau. PostHog propose du local evaluation pour éviter ça, à configurer dès le départ.
5. **SSR et flags**. Si un flag affecte le rendu SSR, il faut l'évaluer avant le render (server-side), pas côté client, sinon hydration mismatch.

---

## 3. Cas limites et pièges

### Le piège n°1 : changement de schéma Prisma

Un feature flag ne peut pas flipper une migration de schéma. La DB est dans un seul état à la fois.

Deux approches, aucune parfaite.

**Approche "expand / contract"** (recommandée quand possible) :

1. **Expand** : ajouter les nouvelles colonnes en `nullable` (non breaking). Merge et push prod. Flag off, rien ne les lit ou écrit.
2. **Migrate** : le code nouveau écrit dans les nouvelles colonnes, sous flag. Backfill des données si besoin.
3. **Contract** : une fois le flag à 100% stable et l'ancien code supprimé, on drop les anciennes colonnes.

Exemple concret : passer `Moment.coverImageUrl` (texte) vers une table `MomentCovers` (plusieurs images).

- Étape 1 : créer `MomentCovers`, garder `coverImageUrl` sur `Moment`, flag off.
- Étape 2 : sous flag, l'app lit et écrit dans les deux, ou juste la nouvelle.
- Étape 3 : flag à 100%, suppression de `coverImageUrl` en phase contract.

**Approche "branch par version"** : non viable. On ne peut pas avoir deux schémas actifs en même temps sur une même DB.

Rappel projet : la règle `RÈGLE ABSOLUE N°1-BIS` (DB prod avant le merge) reste valable. Un flag ne change rien à cette obligation.

### Autres cas limites

| Cas | Difficulté | Pourquoi |
|---|---|---|
| **Contrainte unique DB** (ex: `@@unique([userId, circleId])`) | Impossible à flipper | La contrainte est dans le schéma, pas dans le code. Passer par expand / contract. |
| **Changement de rôle ou permissions RBAC** | Dangereux | Risque de trou de sécurité si flag mal évalué. Préférer un rollout "tous ou personne" plutôt que par utilisateur. |
| **Modifications Stripe ou webhooks** | Très risqué | Un webhook reçu pendant le flip peut tomber sur un code qui ne sait pas le gérer. Prévoir idempotence et fallback. |
| **Emails transactionnels** | Piège subtil | Un flag qui modifie un template doit gérer les emails déjà en file. Le flag doit être évalué au moment de l'envoi, pas de la mise en file. |
| **URLs, slugs, SEO** | Impossible sans plan | Un flag qui change `/m/[slug]` casse les liens partagés. Utiliser des redirections, pas un feature flag. |
| **Données déjà créées sous l'ancien schéma** | Coûteux | Besoin de backfill ou de double-read. Pas un blocker mais à budgéter. |
| **Types TypeScript partagés front / back** | Gênant | Si le flag ajoute un champ, le type est soit présent soit absent partout. Garder le champ optionnel pendant la transition. |
| **Cache Next.js** (ISR, `revalidate`) | Piège | Une page cachée peut servir l'ancien rendu après activation. Invalider le cache ou passer en rendu dynamique sous flag. |
| **Jobs cron** (Vercel cron) | Piège | Un cron qui tourne toutes les X minutes doit lire le flag à chaque exécution, pas au démarrage. |
| **Auth.js et sessions** | Sensible | Ne jamais flagger la logique d'auth. Risque de lock-out utilisateur. |

### Cas où le feature flag est le mauvais outil

- **Refactor interne sans changement fonctionnel** : pas besoin, c'est un merge classique.
- **Bug fix critique** : un fix doit être déployé, pas flaggué.
- **Changement de structure URL** : redirections, pas flags.
- **Changement irréversible** (suppression définitive d'une fonctionnalité) : le flag devient un résidu permanent. Préférer une phase de dépréciation puis suppression en deux PRs.
- **Modification d'un contrat d'API publique** : versioning d'API, pas feature flag.

---

## Recommandation pour The Playground

1. **Adopter PostHog Feature Flags**. Déjà dans la stack, zéro coût supplémentaire.
2. **Créer un port `FeatureFlagService`** dans `domain/ports/services/` et un adapter PostHog dans `infrastructure/services/posthog/`. Respect de l'architecture hexagonale.
3. **Convention de nommage** : `kebab-case`, namespacé par domaine. Exemples : `moment.proposed-vote`, `page.event.social-proof-v2`, `ops.email.kill-switch`.
4. **Registre `spec/infra/feature-flags-registry.md`** : key, description, date de création, date de mort prévue, responsable, état (off, rollout, 100%, dead).
5. **Discipline** : un flag a une date de mort. PR de nettoyage obligatoire à cette date, pas de flag orphelin.
6. **Règle DB** : jamais de flag pour flipper un changement de schéma. Toujours expand / contract, avec le flag qui contrôle la logique applicative, pas la structure.
7. **Première cible naturelle** : `moment.proposed-vote` (spec existante dans `spec/features/moment-proposed-vote.md`), pour se faire la main sur un cas modéré avant des usages plus sensibles.

## Prochaines étapes possibles

- Poser l'infrastructure dans une branche dédiée : port, adapter PostHog, helper client et server, registre vide, tests unitaires du port, tests d'intégration de l'adapter, documentation courte.
- Ou discuter d'abord de la première fonctionnalité à flagger pour calibrer l'API avec un cas réel.
