# Feature — Bouton de partage sur les pages publiques

**Statut :** Prêt pour implémentation
**Date :** 2026-05-08
**Issue :** [#430](https://github.com/DragosDreptate/the-playground/issues/430)
**Contexte :** Aucun bouton de partage dédié sur les pages publiques. Limite la viralité spontanée, alors même que c'est le levier de distribution principal du modèle (CLAUDE.md : "Mobile-first, lien partagé via WhatsApp/Instagram/Slack").

---

## Périmètre

Composant générique `(url, ariaLabel, onShared?)` (voir décision 10 pour le détail), intégré sur les **deux pages publiques** :

- **Page événement** `/m/[slug]` — cas d'usage primaire, l'événement est l'unité virale du modèle.
- **Page Communauté** `/circles/[slug]` — couche de rétention. Permet à un membre d'amener un proche entre deux événements, ou de partager spontanément la communauté.

**Audience du bouton :** visible pour **tous les utilisateurs** présents sur ces pages, sans condition de rôle :

- Visiteur anonyme
- Participant inscrit ou non
- Organisateur connecté (voir ci-dessous)

### Pourquoi pas de page dédiée dans le dashboard Participant

Il n'existe pas de "page événement individuel" ni de "page Communauté individuelle" dans le dashboard côté Participant. Le dashboard `/dashboard` est une timeline unifiée. Quand le Participant clique sur un événement ou une Communauté, il atterrit directement sur les slugs publics `/m/[slug]` et `/circles/[slug]`. Ces deux surfaces couvrent donc 100 % du parcours Participant — aucune duplication à prévoir.

### Pourquoi le bouton reste visible pour l'Organisateur

Le bouton mobile-only ne fait pas doublon avec sa card de partage desktop :

- L'Organisateur consulte régulièrement la page publique pour vérifier ce que voient ses participants. Sur mobile, sa card de dashboard ne lui sert pas, alors que le sheet natif (WhatsApp, Messages, AirDrop...) est exactement l'outil dont il a besoin.
- Cacher conditionnellement le bouton selon le rôle ajoute de la logique sans bénéfice clair.

**Hors périmètre :** les vues Organisateur (dashboard) disposent déjà de leurs propres dispositifs de partage / invitation :

- Sur l'événement : card "Partager mon événement" (lien copiable + invitations email batch)
- Sur la Communauté : card `circle-share-invite-card.tsx` (lien copiable + invitations email batch)

Ces cards restent inchangées. Le nouveau bouton mobile s'ajoute aux pages publiques sans toucher au dashboard.

---

## Décisions prises

### 1. Mobile uniquement, pas de bouton desktop

Aligné avec Luma. Trois raisons :

- **Sur desktop, le bouton n'apporte rien.** L'URL est dans la barre du navigateur, Cmd+L puis Cmd+C la copie en deux gestes natifs. Un bouton "Copier" duplique cette capacité pour zéro gain. Un bouton "Partager" sans Web Share API riche (pas d'écosystème WhatsApp / AirDrop sur desktop) trahit la promesse.
- **Sur mobile, le bouton est la seule passerelle vers l'écosystème d'apps.** WhatsApp, Messages, AirDrop, Instagram DM, Slack mobile : aucun de ces canaux n'est accessible sans `navigator.share`. C'est exactement le cas d'usage du issue.
- **Cohérence avec la philosophie produit.** "Mobile-first, parcours Participant optimisé pour mobile" est inscrit dans CLAUDE.md.

**Conséquence technique :** masquage via Tailwind `lg:hidden` — bouton visible sur smartphone et tablette (jusqu'à 1023 px), caché à partir du breakpoint `lg` (≥ 1024 px). C'est le breakpoint déjà utilisé partout dans le projet pour la séparation mobile / desktop. Pas de fallback `clipboard.writeText` à coder.

### 2. Web Share API (`navigator.share`) comme unique mécanique

- Ouvre le sheet natif du système (iOS / Android), qui propose tout l'écosystème d'apps installées par l'utilisateur.
- Fonctionne en PWA installée (iOS 12.2+, Android Chrome / Edge). Pas de piège PWA spécifique. Contraintes déjà respectées : HTTPS et user gesture.

### 3. Si `navigator.share` indisponible, on cache le bouton

Cas marginal (~2 à 3 % des navigateurs mobiles : vieux Firefox Android, etc.). Plutôt que de coder un fallback faiblard "Copier le lien", on masque le bouton à l'hydratation. Le composant ne sait faire qu'une seule chose, bien.

### 4. Emplacement : overlay top-right de la cover

Sur les deux pages publiques, position identique. Validé via mockup `spec/mockups/share-button-mobile.mockup.html`.

- **Pourquoi cet endroit :** above-the-fold, pattern reconnu (Spotify, Apple Music, Instagram, Luma), zone DOM libre aujourd'hui (top-left = badge Demo, bottom = attribution Unsplash, top-right = vide).
- **Cohérence cross-page :** la cover existe sur les deux pages avec la même structure, le placement est donc identique sans effort.

### 5. Style du bouton

- Pastille ronde **36 × 36 px**
- Fond `rgba(0, 0, 0, 0.45)` + `backdrop-filter: blur(8px)`
- Bordure subtile `rgba(255, 255, 255, 0.18)` pour décoller le bouton sur les fonds très clairs
- Icône blanche, **17 × 17 px**
- Pas de libellé (icône seule)
- Animations légères au `hover` / `active` (scale 1.05 / 0.96)

### 6. Icône iOS-style (SVG custom, pas Lucide)

Lucide n'a pas l'icône iOS share standard (rectangle ouvert + flèche montante). On utilise un SVG custom :

```svg
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 3v13"/>
  <path d="M16 7l-4-4-4 4"/>
  <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5"/>
</svg>
```

### 7. Contenu du partage : url seule, pas de title ni text

Identique pour événement et Communauté.

```ts
// Page événement
navigator.share({ url: `https://the-playground.fr/m/${moment.slug}` });

// Page Communauté
navigator.share({ url: `https://the-playground.fr/circles/${circle.slug}` });
```

**Pourquoi pas de `title` ni `text` :**

- **Pollution du presse-papier.** Sur Android Chrome notamment, l'action "Copier le lien" du share sheet concatène `title + url` ("Soirée React et Next.js https://the-playground.fr/m/xxx"). L'utilisateur qui fait Share puis Copier le fait quasi systématiquement pour coller ailleurs (champ URL, search bar, message rapide) : avoir une URL propre est essentiel. Comportement iOS plus propre mais non garanti.
- **Double-affichage avec la preview OG.** Sur WhatsApp, Slack, Telegram, le destinataire voit déjà un link preview riche (image OG carrée + titre + description) lu depuis l'URL. Un `text` ou un `title` redondant pollue.
- **Le partageur ajoute son propre message** ("Tiens, ce truc à la Station F"). Pattern Luma : on laisse parler la personne, pas de pré-remplissage présomptueux.

**Conséquences acceptées :**

- Sur Email (présent dans le share sheet natif), l'objet sera vide. Le partageur tape son objet. Cas rare en mobile share spontané, acceptable.
- Le link preview côté destinataire reste intact (OG est lu depuis l'URL, pas affecté par les params `share()`).

**Détail technique :** l'URL doit être **absolue avec le domaine prod**, construite côté server à partir de `NEXT_PUBLIC_APP_URL` puis passée en prop au composant client. Ne jamais utiliser `window.location.origin` qui leakerait `localhost` en dev ou des previews Vercel.

### 8. Visibilité selon le statut

**Page événement :**

| Statut | Bouton visible ? | Raison |
|---|---|---|
| `DRAFT` | Non | OG meta vides + partage prématuré d'un événement non publié, l'inscription est bloquée |
| `PUBLISHED` | Oui | Cas principal |
| `PAST` | Oui | Permet le partage rétrospectif (témoignages, photos, attire l'attention sur les événements suivants de la Communauté) |
| `CANCELLED` | Non | Rien d'utile à partager |

**Page Communauté :** toujours visible sur la version publique (`/circles/[slug]`).

### 9. Tracking PostHog

Conventions du projet (snake_case events et propriétés, capture client-side via `posthog-js`).

**Événements :**

```ts
// Page événement
posthog.capture("moment_shared", {
  moment_id: moment.id,
  moment_slug: moment.slug,
  circle_id: moment.circleId,
  circle_name: circle.name,
  moment_status: moment.status, // permet de différencier partage upcoming vs past
});

// Page Communauté
posthog.capture("circle_shared", {
  circle_id: circle.id,
  circle_slug: circle.slug,
  circle_name: circle.name,
});
```

**Quand capturer :** uniquement au **succès** de `navigator.share()` (résolution de la Promise). Pas de tracking sur `AbortError` (utilisateur qui ouvre le sheet puis annule). On veut mesurer le partage **effectif**, pas l'intention.

```ts
try {
  await navigator.share({ url });
  posthog.capture("moment_shared", { /* ... */ });
} catch (err) {
  // AbortError = user cancelled, on ignore
  // Autres erreurs = silencieux (rien à montrer à l'utilisateur)
}
```

**Pas d'identification du destinataire :** la Web Share API ne donne pas accès à l'app cible choisie par l'utilisateur (privacy by design). On capture donc le partage en binaire (success / pas success). C'est suffisant pour le métrique de viralité.

### 10. Signature et responsabilités du composant

Composant 100 % générique, agnostique du contenu partagé. Le caller (page événement ou page Communauté) sait ce qu'il partage et fournit le contexte.

```ts
type ShareButtonProps = {
  /** URL absolue à partager. Ne jamais passer une URL relative. */
  url: string;
  /** Libellé a11y du bouton, ex : "Partager cet événement" / "Partager cette communauté". */
  ariaLabel: string;
  /** Callback appelé uniquement au succès de navigator.share().
   *  Le caller y fait son posthog.capture avec ses propres ids/noms. */
  onShared?: () => void;
};
```

**Pourquoi ce découpage :**

- Le composant ne fait pas d'i18n (le caller passe déjà le label traduit). Plus simple à tester en isolation.
- Le composant ne connaît pas l'event PostHog à capturer (`moment_shared` vs `circle_shared`). Le caller centralise sa logique de tracking dans son `onShared`. Découplage propre.
- Pas de couplage au domaine (`Moment`, `Circle`) : le composant pourrait être réutilisé pour partager n'importe quelle URL future (profil utilisateur, blog, etc.).

### 11. Contraintes techniques d'implémentation

**Composant client.** Le composant utilise `navigator.share()` (API browser-only), donc **forcément `"use client"`** en première ligne. Pas négociable.

**Hydratation SSR.** Le composant est rendu côté server (Next.js App Router) avant d'être hydraté côté client. Au moment du rendu serveur, `navigator` n'existe pas. La détection de support doit donc se faire **après l'hydratation**, pas pendant le render initial. Pattern standard :

```tsx
"use client";
import { useEffect, useState } from "react";

export function ShareButton({ url, ariaLabel, onShared }: ShareButtonProps) {
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  if (!canShare) return null;
  // ... rendu du bouton
}
```

Conséquence : le rendu HTML initial ne contient **pas** le bouton. Il apparaît après l'hydratation côté client. Pas de flash visible parce que le bouton est petit et la cover est déjà visible avec ou sans lui.

**Construction de l'URL absolue côté server.** Toujours utiliser le pattern projet existant (vu dans `m/[slug]/page.tsx` ligne 171) :

```ts
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const shareUrl = `${appUrl}/m/${moment.slug}`; // ou /circles/${circle.slug}
```

L'URL est construite **côté server**, passée en prop au `<ShareButton url={shareUrl} ... />`. Ne jamais utiliser `window.location.href` qui leakerait `localhost` en dev ou des previews Vercel sur partage.

**Accessibilité du SVG.** Le SVG décoratif porte `aria-hidden="true"`. L'`aria-label` vit uniquement sur l'élément `<button>` parent.

```tsx
<button aria-label={ariaLabel} className="...">
  <svg aria-hidden="true" viewBox="0 0 24 24" ...>...</svg>
</button>
```

---

## Internationalisation

Deux clés à ajouter dans `messages/fr.json` et `messages/en.json`, namespace **`Common.share`** :

| Clé | FR | EN |
|---|---|---|
| `Common.share.eventLabel` | Partager cet événement | Share this event |
| `Common.share.communityLabel` | Partager cette communauté | Share this community |

Le caller (page événement / page Communauté) utilise `useTranslations("Common.share")` côté client (ou `getTranslations` côté server) pour résoudre la bonne clé et la passer au composant via la prop `ariaLabel`.

---

## Tests

### Tests unitaires Vitest (`src/components/__tests__/share-button.test.tsx`)

| Cas | Comportement attendu |
|---|---|
| Render initial (avant hydratation, `navigator.share` non probé) | Composant retourne `null` |
| Post-hydratation, `navigator.share` disponible | Bouton visible, attributs `aria-label` corrects, SVG avec `aria-hidden="true"` |
| Post-hydratation, `navigator.share` absent | Composant retourne `null` |
| Click + `navigator.share` resolve | `onShared` appelé une fois |
| Click + `navigator.share` reject avec `AbortError` (utilisateur annule) | `onShared` NON appelé, pas d'erreur thrown |
| Click + `navigator.share` reject avec autre erreur | `onShared` NON appelé, pas d'erreur thrown (silencieux côté UI) |

Mock de `navigator.share` via `vi.stubGlobal("navigator", { share: vi.fn() })`.

### Tests E2E

**Pas de test E2E dédié au composant.** Raison : Playwright ne peut pas tester `navigator.share` proprement (l'API ouvre un sheet OS qui n'est pas scriptable, et n'est pas exposée sur les viewports desktop par défaut). On s'appuie sur les tests unitaires Vitest pour la logique, et sur le mockup pour la validation visuelle.

---

## Questions ouvertes

Aucune. La spec est complète, prête pour implémentation.

---

## Référence

- Issue GitHub : [#430](https://github.com/DragosDreptate/the-playground/issues/430)
- Mockup : [`spec/mockups/share-button-mobile.mockup.html`](../mockups/share-button-mobile.mockup.html)

### Fichiers concernés

| Fichier | Action |
|---|---|
| `src/components/share-button.tsx` | À créer — composant générique, hors `moments/` puisque utilisé aussi pour Communauté |
| `src/components/__tests__/share-button.test.tsx` | À créer — tests Vitest |
| `src/components/moments/moment-detail-view.tsx` | À modifier — intégration overlay top-right de la cover, branchement `posthog.capture("moment_shared", ...)` dans le `onShared` |
| `src/app/[locale]/(routes)/circles/[slug]/page.tsx` | À modifier — intégration overlay top-right de la cover, branchement `posthog.capture("circle_shared", ...)` dans le `onShared` |
| `messages/fr.json` | À modifier — ajouter `Common.share.eventLabel` et `Common.share.communityLabel` |
| `messages/en.json` | À modifier — ajouter `Common.share.eventLabel` et `Common.share.communityLabel` |
