# Pipeline CI/CD : du commit au déploiement

> Schéma exhaustif du pipeline d'intégration et de déploiement continu de The
> Playground : enchaînement des étapes, triggers, outils impliqués.
>
> Reconstitué à partir de `.github/workflows/*`, `vercel.json`, `scripts/vercel-ignore.sh`
> et `package.json`. Date : 2026-06-03.

Version illustrée : [`assets/cicd-pipeline.svg`](assets/cicd-pipeline.svg) (et `.png`).

## Vue d'ensemble : 4 mondes

```
  TON POSTE          GITHUB                 GITHUB ACTIONS         VERCEL              PROD (runtime)
  ─────────          ──────                 ──────────────         ──────              ──────────────
  écriture du   →    stockage du     →      validation       +    build &        →    app servie +
  code + tests       code + triggers        (qualité)             déploiement          crons + télémétrie
```

Point clé : après un merge, **deux pistes partent en parallèle** depuis le même
événement git. GitHub Actions **valide** (il ne déploie pas), Vercel **build et
déploie** (il ne bloque pas sur les tests). Deux systèmes indépendants déclenchés
par le même push.

## Flux principal

```
┌──────────────────────────────────────────────────────────────────────────┐
│ PHASE 1 · LOCAL                                            outils: pnpm,   │
│                                                            next, vitest    │
│   pnpm dev            (next dev, serveur de dev)                           │
│   pnpm typecheck      (tsc --noEmit)                                       │
│   pnpm test:unit      (vitest)                                             │
│   pnpm test:e2e       (playwright, optionnel en local)                    │
│                                                                            │
│   git commit  ─►  git push origin feat/xxx                                │
└───────────────────────────────────┬──────────────────────────────────────┘
                                     │  TRIGGER: push branche + ouverture PR
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ PHASE 2 · PULL REQUEST vers main                                          │
│                                                                            │
│   ╔════════════════ GitHub Actions: ci.yml ════════════════╗              │
│   ║  (paths-ignore: spec/**, *.md, ISSUE_TEMPLATE)          ║              │
│   ║  concurrency: annule le run précédent sur même branche  ║              │
│   ║                                                          ║              │
│   ║   3 JOBS EN PARALLÈLE (runners ubuntu, Node 22, pnpm):  ║              │
│   ║                                                          ║              │
│   ║   ┌─ typecheck ──┐  ┌─ test-unit ─┐  ┌─ test-e2e ──────────────────┐ ║
│   ║   │ pnpm install │  │ pnpm install│  │ pnpm install                │ ║
│   ║   │ pnpm         │  │ pnpm        │  │ cache Playwright            │ ║
│   ║   │ typecheck    │  │ test:unit   │  │ ① crée branche Neon isolée  │ ║
│   ║   └──────────────┘  └─────────────┘  │   (e2e-<run_id>, parent dev)│ ║
│   ║                                       │ ② pnpm build  ◄── BUILD #1  │ ║
│   ║                                       │   (next build de prod)      │ ║
│   ║                                       │ ③ pnpm test:e2e (playwright)│ ║
│   ║                                       │ ④ supprime la branche Neon  │ ║
│   ║                                       │   (always, même si échec)   │ ║
│   ║                                       └─────────────────────────────┘ ║
│   ╚══════════════════════════════════════════════════════════╝           │
│        │ required status checks (branch protection)                       │
│        ▼ typecheck + test-unit + test-e2e doivent être verts              │
│                                                                            │
│   ╔═══ docs-ci.yml (SI la PR ne touche QUE des docs) ═══╗                  │
│   ║  jobs factices qui « passent » les checks requis    ║                  │
│   ║  sans builder (rien à compiler sur du markdown)     ║                  │
│   ╚═════════════════════════════════════════════════════╝                 │
│                                                                            │
│   ⚠ VERCEL PREVIEW: DÉSACTIVÉ sur les PR.                                  │
│     vercel-ignore.sh → exit 0 pour toute branche ≠ main/staging           │
└───────────────────────────────────┬──────────────────────────────────────┘
                                     │  TRIGGER: gh pr merge --merge (manuel)
                                     │  ⚠ étape explicite du workflow git
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ PHASE 3 · MERGE sur main → DEUX PISTES PARALLÈLES                         │
│                                                                            │
│   PISTE A (validation)                  PISTE B (build + deploy)           │
│   ═══════════════════                   ══════════════════════            │
│   GitHub Actions                        Vercel (webhook git)              │
│                                                                            │
│   • ci.yml re-tourne sur push main      • ignoreCommand: vercel-ignore.sh │
│     (typecheck, unit, e2e + BUILD #1)     décide build vs skip:           │
│   • release-please.yml                    ├─ main + src/content/** → BUILD │
│     crée/maj la « Release PR »            ├─ main + docs/scripts → SKIP    │
│   • sync-version.yml                      └─ main + code → BUILD           │
│     (si CHANGELOG.md changé)                      │                        │
│                                                   ▼                        │
│                                          ┌─────────────────────────────┐  │
│                                          │ BUILD #2 (le déployé)        │  │
│                                          │ next build via:              │  │
│                                          │  withSentryConfig            │  │
│                                          │   → upload source maps       │  │
│                                          │  withPWA (service worker)    │  │
│                                          │  withNextIntl (i18n)         │  │
│                                          │ → transpile TS, bundle,      │  │
│                                          │   prerender ISR, Tailwind    │  │
│                                          │ → artefact .next/            │  │
│                                          └──────────────┬──────────────┘  │
│                                                         ▼                  │
│                                          ┌─────────────────────────────┐  │
│                                          │ DEPLOY + promotion auto      │  │
│                                          │ → the-playground.fr (prod)   │  │
│                                          │ (staging → env staging)      │  │
│                                          └──────────────┬──────────────┘  │
└─────────────────────────────────────────────────────────┼────────────────┘
                                                           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ PHASE 4 · RUNTIME (prod en ligne)                                         │
│                                                                            │
│   • Vercel Cron (7 jobs) appellent /api/cron/* selon leur schedule        │
│       reminders (horaire), transitions (30min), scores (3h), reports...   │
│   • Sentry capture les erreurs runtime (de.sentry.io)                     │
│   • PostHog capture l'analytics (eu.posthog.com)                          │
│   • DB Neon (eu-central-1) sert les requêtes                              │
└──────────────────────────────────────────────────────────────────────────┘
```

## Les triggers : qui déclenche quoi

| Événement git | `ci.yml` | `docs-ci.yml` | Vercel build | `release-please` | `sync-version` |
|---|:---:|:---:|:---:|:---:|:---:|
| PR vers `main` (code) | build + tests | – | preview off | – | – |
| PR vers `main` (docs seuls) | paths-ignore | checks factices | skip | – | – |
| push `staging` | oui | – | build → env staging | – | – |
| **merge `main` (code)** | oui | – | build → **prod** | oui | si `CHANGELOG.md` |
| merge `main` (docs seuls) | paths-ignore | – | vercel-ignore skip | oui | – |
| merge la Release PR | oui | – | oui | tag + release | oui |

## Pourquoi le build apparaît deux fois

C'est la subtilité la plus importante du pipeline :

- **BUILD #1 (dans CI, job `test-e2e`)** : `pnpm build` est lancé pour tester l'app
  sur un build de production stable (plus fiable que `next dev`), contre une **branche
  Neon jetable** créée et détruite à la volée. Ce build sert à **valider**, il n'est
  jamais déployé.
- **BUILD #2 (dans Vercel, au merge)** : le vrai build, qui passe par `withSentryConfig`
  (upload des source maps), `withPWA`, `withNextIntl`, et dont l'artefact `.next/` est
  **déployé en production**.

Même commande `next build`, mais l'un est un banc d'essai, l'autre est la livraison.

## Les outils, par étape

| Étape | Outils |
|---|---|
| Code & dev local | pnpm, Next.js (`next dev`), TypeScript, Vitest, Playwright |
| Source & triggers | Git, GitHub, branch protection (required checks) |
| Validation CI | GitHub Actions, runners Ubuntu, Node 22, Neon (branches éphémères), Playwright |
| Build | `next build`, Turbopack/webpack, plugins Sentry / PWA / next-intl, Prisma generate (`postinstall`) |
| Déploiement | Vercel (webhook git, `ignoreCommand`, Fluid Compute, promotion auto) |
| Versioning | release-please, sync-version, humanize-changelog |
| Sécurité (hors flux) | DAST OWASP ZAP : `dast-prod-baseline` (hebdo dimanche 4h + manuel), `dast-preview-full` (manuel) |
| Runtime | Vercel Cron (7 jobs), Sentry, PostHog, Neon |

## Lien avec la migration de souveraineté

Ce schéma montre ce que **Vercel fait gratuitement** et qu'il faudra reconstruire en
partant (Phase 3 piste B + Phase 4 crons) : le webhook git-to-build, l'exécution de
`next build`, la promotion automatique, et le scheduler des 7 crons. La piste A (GitHub
Actions) et la validation restent inchangées quel que soit l'hébergeur, puisqu'elles ne
dépendent pas de Vercel (sauf la branche Neon de test, qui suivra la migration DB).

Voir [`sovereignty-migration.md`](sovereignty-migration.md).
