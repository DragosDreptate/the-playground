# White-label mono-communauté — Analyse & Options

> Document de référence issu des discussions du 2026-02-22.
> Aucune décision finale prise à ce stade — ce fichier trace les options pour arbitrage futur.

---

## Contexte & besoin

The Playground est une plateforme **multi-communautés** (community-centric). Certaines organisations souhaitent une version dédiée à **une seule communauté** : leur propre, avec leur propre branding.

Dans ce modèle :
- La **Communauté disparaît de l'interface** (elle existe toujours en DB mais est implicite — une seule, fixe)
- Les **événements, inscriptions, liste d'attente, membres, commentaires, emails, paiement** restent intacts
- Le nom de la plateforme, les couleurs, le logo sont ceux du client

Ce qui disparaît de l'UI :
- Sélection / création de Communauté
- Découvrir / Explorer (pas de découverte multi-communautés)
- Notion de "s'inscrire à une Communauté" (on est membre de LA communauté)

Ce qui change de sens :
- "Membres" = membres de la communauté unique (pas d'une Communauté parmi d'autres)
- Dashboard = liste des événements directement, sans couche Communauté

---

## Option A — Flag d'environnement `SINGLE_TENANT`

Une variable `SINGLE_TENANT_CIRCLE_ID=xxx` en env. Le code affiche ou masque la couche Communauté selon ce flag. Même codebase, même DB.

**Pour :**
- Zéro fork, zéro duplication
- Un correctif = corrigé partout
- Déployable en quelques heures

**Contre :**
- Conditionnels `if (isSingleTenant)` qui prolifèrent dans les composants
- Les deux modes coexistent dans le même code → dette technique croissante
- Compliqué à tester proprement

**Difficulté :** ⭐⭐ démarrage / ⭐⭐⭐ long terme

---

## Option B — Fork dédié

Nouveau repo GitHub (privé), copie de `main` à l'instant T. Déployé séparément sur Vercel.

**Pour :**
- Propre, sans condition — code simplifié
- Liberté totale sur le design et les fonctionnalités
- Le client peut avoir accès à son propre repo privé

**Contre :**
- Toute amélioration de The Playground doit être reportée manuellement
- Maintenance × 2 : bugs corrigés dans un repo, pas l'autre
- Divergence inévitable sur 6 mois

**Difficulté :** ⭐ démarrage / ⭐⭐⭐⭐⭐ long terme

---

## Option C — Monorepo avec packages partagés (Turborepo)

Extraire la logique domaine en packages partagés. Deux apps distinctes.

```
packages/
  domain/        → modèles, usecases, ports (partagés)
  ui/            → composants communs (partagés)
apps/
  playground/    → the-playground.fr (multi-communauté)
  white-label/   → events.mycommunity.com (mono-communauté)
```

**Pour :**
- Architecture la plus propre à long terme
- Les deux apps bénéficient des améliorations du domaine partagé
- Chaque app a son propre UI sans condition

**Contre :**
- Refactoring significatif du codebase existant
- Turborepo / pnpm workspaces à configurer
- À entreprendre uniquement quand le domaine est stable (pas en phase MVP)
- Complexité de déploiement (deux apps sur Vercel)

**Difficulté :** ⭐⭐⭐⭐ démarrage / ⭐⭐ long terme

---

## Option D — Domaine personnalisé par Communauté ⭐ recommandée

Chaque Communauté peut avoir un domaine custom (`events.mycommunity.com`). Sur ce domaine, seule cette Communauté est affichée. The Playground reste l'infrastructure invisible.

```
the-playground.fr          → plateforme multi-communauté (Découvrir, etc.)
events.mycommunity.com     → Circle ID=xxx, branding custom, mono-communauté
```

**Principe technique :**
- Le middleware détecte le domaine entrant → résout le Circle associé
- L'UI masque la couche Communauté (plus de selector, plus de Découvrir)
- Le header affiche le nom et le logo du client
- Un objet `theme` en DB contient les variables CSS du client

**Pour :**
- Pas de fork, pas de monorepo — même codebase
- Scalable : chaque client obtient son domaine sans nouveau déploiement
- Modèle SaaS propre (custom domain = feature Plan Pro potentielle)
- The Playground reste la plateforme, le client a son identité

**Contre :**
- Gestion des domaines custom complexe (Vercel Domains API, DNS, SSL)
- Middleware de routing à écrire (détecter le domaine → résoudre la Communauté)
- UI "mode domaine custom" à implémenter

**Difficulté :** ⭐⭐⭐ démarrage / ⭐⭐ long terme

---

## Theming par domaine (charte graphique client)

L'architecture actuelle (Tailwind CSS 4 + variables CSS shadcn/ui) est **nativement prête** pour le theming. Tous les composants utilisent des variables CSS (`--primary`, `--background`, `--foreground`, etc.) — aucune couleur hardcodée dans les composants.

### Principe

Chaque Circle avec domaine custom stocke un objet `theme` en DB (JSON). Au chargement, le layout injecte les variables CSS :

```json
// DB : Circle.theme (JSON)
{
  "primary": "oklch(0.65 0.25 220)",
  "background": "oklch(0.98 0 0)",
  "foreground": "oklch(0.15 0 0)"
}
```

```tsx
// layout.tsx — injection dynamique
<html style={{ "--primary": theme.primary, "--background": theme.background, ... }}>
```

Résultat : tous les composants `bg-primary`, `text-primary`, etc. prennent automatiquement les couleurs du client — **zéro modification des composants**.

### Ce qui est themable facilement (⭐)
- Couleur primaire (boutons, liens, accents) — une variable suffit
- Couleur de fond / texte
- Logo / nom de la plateforme (`brandName` + `logoUrl`)
- Dark/light mode par défaut
- Radius des boutons/cards (`--radius` déjà dans shadcn)

### Ce qui est themable avec effort (⭐⭐⭐)
- **Images OG dynamiques** (`next/og`) : couleurs hardcodées en inline styles → à passer en paramètres de route
- **Polices custom** : `next/font` se configure à la compilation → nécessite `@font-face` CSS dynamique au runtime
- **Emails react-email** : couleurs inline dans les templates → à paramétrer à l'envoi

### Estimation
Theming complet (couleur + logo + nom) ≈ **2-3 jours** une fois l'Option D en place. Polices et emails themés sont optionnels, à traiter en Phase 2.

---

## Stratégie de démo

Avant d'implémenter l'Option D, une démo peut être réalisée simplement pour valider le concept auprès d'un client.

### Option démo 1 — Branche Git + Vercel Preview ⭐ recommandée

```bash
git checkout -b demo/mono-community
# modifications UI de démo (masquer Circle, rebrand)
# Vercel déploie automatiquement sur une URL preview
```

**Pour :**
- URL partageable immédiatement (`the-playground-git-demo-mono.vercel.app`)
- Zéro risque sur `main`
- Synchronisable avec `main` via `git merge`
- Si la démo convainc → base de travail pour l'Option D

**Contre :** les modifications de la branche demo ne remontent pas automatiquement

**Difficulté :** ⭐

### Option démo 2 — Git worktree local (présentiel)

```bash
git worktree add ../the-playground-demo demo/mono-community
cd ../the-playground-demo
# lancer sur port 3001
```

**Pour :** zéro déploiement, parfait pour démo en présentiel sur laptop
**Contre :** pas partageable à distance
**Difficulté :** ⭐

### Option démo 3 — Fork du repo

Nouveau repo GitHub privé, déployé séparément sur Vercel.

**Pour :** isolation totale, le client peut voir son propre repo
**Contre :** overkill pour une démo, maintenance double dès le premier jour
**Difficulté :** ⭐ démarrage / ⭐⭐⭐⭐ long terme

### Option démo 4 — Env vars uniquement sur `main`

Second projet Vercel pointant sur le même repo `main`, avec des variables d'environnement activant un mode mono-communauté minimal.

**Pour :** zéro branche, zéro fork
**Contre :** nécessite quand même de toucher `main` pour lire ces variables
**Difficulté :** ⭐⭐

---

## Workflow Claude Code avec plusieurs branches

**Principe fondamental :** Claude Code est lié à son répertoire de travail au démarrage. Lancer Claude depuis le bon dossier suffit — pas besoin de préciser le contexte dans chaque prompt.

```bash
# Terminal 1 — main (développement normal)
cd "/Users/dragos/AI Projects/the-playground"
claude

# Terminal 2 — branche/worktree démo
cd "/Users/dragos/AI Projects/the-playground-demo"
claude
```

Deux fenêtres de terminal → deux instances Claude Code → zéro ambiguïté, zéro répétition.

| Élément | Partagé entre sessions ? |
|---------|--------------------------|
| Fichiers du projet | ❌ Chaque session voit son dossier |
| `CLAUDE.md` | ✅ Identique (même fichier versionné) |
| Mémoire auto (`MEMORY.md`) | ⚠️ Liée au chemin — sessions séparées = mémoires séparées |
| Historique de conversation | ❌ Chaque session est indépendante |

**Contournement perte de mémoire :** ajouter un `CLAUDE.md` dans la branche/worktree démo avec le contexte spécifique + référence aux conventions du projet principal.

---

## Base de données pour la démo (Neon)

Neon supporte le **branching natif** — exactement comme git. Une branche DB = snapshot isolé avec son propre endpoint, ses propres données, sans impact sur les autres branches.

### Architecture actuelle

```
production   ←  Vercel prod (the-playground.fr)
dev          ←  développement local
```

### Option recommandée — Nouvelle branche Neon `demo`

```
production   ←  Vercel prod
dev          ←  développement local
demo         ←  branche démo, isolée
```

Créée depuis `production` (schéma propre + données démo `@demo.playground` déjà seedées). Endpoint dédié → `DATABASE_URL` différente dans le `.env.local` du worktree/branche demo.

**Pour :**
- Isolation totale — aucun risque dans les deux sens
- Peut avoir ses propres données démo (seed `@demo.playground`)
- Supprimable après la démo
- Gratuit (Neon free tier inclut le branching)
- Si le schéma diverge sur la branche demo, ça n'affecte pas `dev` ni `prod`

**Contre :** 2 minutes de config (créer la branche dans le dashboard Neon, copier l'endpoint)

### Tableau de décision

| Scénario | Base recommandée |
|----------|-----------------|
| Démo rapide en local | Branche `demo` Neon |
| Démo déployée sur Vercel Preview | Branche `demo` Neon |
| Démo → prod client long terme | Nouveau projet Neon |
| Test ultra-rapide sans enjeu | Même branche `dev` |

---

## Comparatif global des options d'architecture

| Option | Maintenance | Propreté code | Scalabilité | Difficulté démarrage | Difficulté long terme |
|--------|-------------|---------------|-------------|----------------------|-----------------------|
| A — Flag env | ✅ Une codebase | ⚠️ Conditionnels | ⚠️ Limitée | ⭐⭐ | ⭐⭐⭐ |
| B — Fork | ⚠️ Double maintenance | ✅ Propre | ❌ Nulle | ⭐ | ⭐⭐⭐⭐⭐ |
| C — Monorepo | ✅ Packages partagés | ✅ Très propre | ✅ Excellente | ⭐⭐⭐⭐ | ⭐⭐ |
| D — Custom domain | ✅ Une codebase | ✅ Propre | ✅ Très bonne | ⭐⭐⭐ | ⭐⭐ |

---

## Décisions à prendre

- [ ] Valider l'Option D comme direction long terme
- [ ] Identifier le premier client potentiel pour la démo
- [ ] Choisir la stratégie de démo (branche Git ou worktree local)
- [ ] Décider si le theming couleur est dans le scope de la démo ou post-démo
- [ ] Définir le périmètre fonctionnel minimal de la démo (quels éléments de la Communauté masquer)
