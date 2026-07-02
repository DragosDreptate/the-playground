# Stratégie des badges — cartes Communauté & Événement

> Statut : **proposition** (à valider). Objectif : rationaliser l'affichage des badges de statut/rôle sur toutes les cartes, en réduisant leur présence aux seuls cas quasi-indispensables. Origine : itérations UI de la refonte (branche `fix/refonte-ui-stabilisation`) où l'empilement de badges a créé des incohérences et des problèmes de lisibilité.

## 1. Principe directeur

> **Un badge n'est justifié que s'il change ce que l'utilisateur doit comprendre ou faire.**

On classe chaque état en trois familles :

| Famille | Définition | Politique |
|---|---|---|
| **État d'exception / actionnable** | Modifie l'attente ou l'action (ne pas compter dessus, ta demande n'est pas confirmée, pas encore public…) | **Signaler**, là où l'utilisateur agit dessus |
| **Rôle / relation** | Information « qui je suis vis-à-vis de cet objet » (Organisateur, Membre, Inscrit…) — inférable du contexte | **Ne pas badger** par défaut |
| **État système** | Transparence plateforme (contenu de démo) | Signaler **discrètement** |

Corollaire : le rôle (Organisateur, Co-organisateur, Membre, Inscrit) est presque toujours **déductible du contexte** (on est dans son espace, la page Communauté identifie déjà l'organisateur, un filtre existe). Il ne mérite donc pas un badge sur chaque carte.

## 2. Règle de rendu (leçon des itérations)

> **Le support du signal dépend du type de carte, pour ne jamais gonfler la hauteur de la carte.**

Deux contraintes se combinent :

1. **Lisibilité** — un texte coloré sur fond translucide *clair* posé sur une image de cover est illisible sur les covers claires (logos sur blanc). Sur l'image, il faut un fond **sombre quasi opaque**, jamais un tinté clair.
2. **Hauteur** — un bandeau posé sur le fond de carte (au-dessus/au-dessous du contenu) **augmente la hauteur** de la carte. Acceptable sur un format horizontal, pénalisant sur le format vertical compact des cartes Communauté.

D'où **deux supports selon le type de carte** :

| Type de carte | Support du bandeau | Pourquoi |
|---|---|---|
| **Événement** (format horizontal) | **Bandeau de tête sur le fond de carte** — tinté clair (`bg-{tone}/10`) + `border-b` + cadre de carte assorti. | Carte horizontale : le bandeau de tête reste discret. Rendu identique aux events annulés actuels. |
| **Communauté** (format vertical compact) | **Bandeau superposé sur la partie haute de la cover** — fond sombre quasi opaque (`bg-stone-950/85`) + texte coloré, **quitte à masquer un bandeau de l'image** + cadre de carte assorti. | Préserve la hauteur de la carte. Le fond sombre garantit la lisibilité sur n'importe quel visuel. |

À proscrire dans les deux cas : pill translucide clair (`bg-white/60`) ou tinté léger **sur l'image**.

## 3. Inventaire des surfaces

| # | Surface | Route | Carte | Audience |
|---|---|---|---|---|
| 1 | Explorer — Événements | `/explorer?tab=moments` | `public-moment-card` | Découverte publique |
| 2 | Explorer — Communautés | `/explorer?tab=circles` | `community-card` (public) | Découverte publique |
| 3 | Mon espace — Événements | `/dashboard` | `dashboard-moment-card` | Cockpit perso |
| 4 | Mon espace — Communautés | `/dashboard` | `community-card` (dashboard) | Cockpit perso |
| 5 | Page Communauté publique | `/circles/[slug]` | `moment-timeline-item` (public) | Rétention publique |
| 6 | Page Communauté (host) | `/dashboard/circles/[slug]` | `moment-timeline-item` (dashboard) | Gestion host |
| 7 | Page Réseau | `/networks/[slug]` | `community-card` (public) | Découverte |

Note : Explorer et la page publique n'affichent que des événements **publiés** et **à venir** → Brouillon / Annulé / Passé n'y apparaissent pas.

## 4. Inventaire des états

**Événement / inscription** — `MomentStatus` : DRAFT, PUBLISHED, CANCELLED, PAST · `RegistrationStatus` : PENDING_APPROVAL, REGISTERED, WAITLISTED, CANCELLED, CHECKED_IN, REJECTED.

**Communauté / adhésion** — `CircleMemberRole` : HOST, CO_HOST, PLAYER · `MembershipStatus` : PENDING, ACTIVE.

**Système** — Démo (`isDemo`).

> **« Invité »** n'existe pas comme état de carte : les invitations sont des liens/emails (`inviteToCircleByEmailAction`, template `circle-invitation`). L'acceptation crée une adhésion ACTIVE ou PENDING. Rien à badger tant que l'invitation n'est pas acceptée (la communauté n'apparaît pas encore chez l'invité).
>
> **« Refusé » (REJECTED)** est hors périmètre carte : à traiter en notification, pas en badge persistant.

## 5. Tableau de préconisation

Légende : ✅ signaler · ⚪ traitement visuel (pas un badge) · ❌ ne pas signaler · — non applicable (n'apparaît pas sur cette surface).

### Cartes ÉVÉNEMENT

| État | Nature | Explorer (1) | Mon espace (3) | Page Communauté pub. (5) | Page Communauté host (6) |
|---|---|---|---|---|---|
| **Annulé** | Exception | — | ✅ | ✅ | ✅ |
| **Brouillon** | Exception (host) | — | ✅ (host) | — | ✅ |
| **Passé** | Traitement | — | ⚪ grisé | ⚪ grisé | ⚪ grisé |
| **Aujourd'hui** | Emphase | ⚪ neutre | ⚪ neutre | ⚪ neutre | ⚪ neutre |
| **En attente de validation** | Exception (perso) | ❌ | ✅ | ✅ | ✅ |
| **Liste d'attente** | Exception (perso) | ❌ | ✅ | ✅ | ✅ |
| **Inscrit** | Relation | ❌ | ❌ | ⚪ dot | ⚪ dot |
| **Organisateur (de l'event)** | Relation | ❌ | ❌ (filtre) | ❌ | ❌ |
| **Refusé** | Hors carte | ❌ | ❌ | ❌ | ❌ |

### Cartes COMMUNAUTÉ

| État | Nature | Explorer (2) | Mon espace (4) | Réseau (7) |
|---|---|---|---|---|
| **En attente d'adhésion** | Exception (perso) | ❌ | ✅ | ❌ |
| **Organisateur (HOST)** | Relation | ❌ | ❌ | ❌ |
| **Co-organisateur (CO_HOST)** | Relation | ❌ | ❌ | ❌ |
| **Membre (ACTIVE)** | Relation | ❌ | ❌ | ❌ |
| **Démo** | Système | ✅ discret | — | ✅ discret |

## 6. Le « comment » — patterns visuels retenus

Un seul langage, réutilisé partout :

| Pattern | Pour quels états | Rendu |
|---|---|---|
| **Bandeau de tête (carte ÉVÉNEMENT)** | Annulé, En attente de validation, Liste d'attente | Bandeau plein largeur en tête de carte, sur le fond de carte, fond tinté clair (`bg-{tone}/10`), `border-b`, **cadre de carte assorti** (`border-{tone}/30`), icône + label alignés à gauche. Un seul bandeau par carte (priorité : Annulé > En attente > Liste d'attente). Pour Annulé : + titre barré + cover grisée. Tons : Annulé = destructif, En attente / Liste d'attente = ambre. Surfaces : Mon espace + page Communauté (timeline). |
| **Bandeau sur cover (carte COMMUNAUTÉ)** | En attente d'adhésion | Bandeau plein largeur superposé en haut de la cover, fond sombre quasi opaque (`bg-stone-950/85`) + texte coloré, label centré, **cadre de carte assorti** (`border-{tone}/30`). Quitte à masquer un bandeau de l'image. Préserve la hauteur de la carte. |
| **Badge Brouillon** | Brouillon | Pill discret pointillé/muted (état de workflow host, faible emphase). Host-only. |
| **Traitement « passé »** | Passé | Pas de badge : opacité/grisé de la carte + tri en historique. |
| **Emphase « Aujourd'hui »** | Aujourd'hui | Accent **neutre** sur la date (jamais un badge rose). |
| **Dot de timeline** | En attente / Liste d'attente / Inscrit sur la page Communauté | Point coloré ambient (ambre = en attente/liste, plein = actif). Signal léger, pas de texte. |
| **Pill Démo** | Démo | Pill système neutre (slate), coin de cover. Distinct des badges de statut utilisateur. |

## 7. État d'implémentation (2026-07-02)

| Élément | Statut |
|---|---|
| Explorer événements : scrim Organisateur / Inscrit sur cover | **Retiré** ✅ |
| Mon espace événements : bandeau Annulé / En attente / Liste d'attente | Conservé ✅ |
| Mon espace événements : cadre de carte ambre pour En attente / Liste d'attente | **Ajouté** ✅ |
| Page Communauté (timeline) : bandeau En attente / Liste d'attente + cadre ambre | **Ajouté** ✅ (statut d'inscription câblé sur la page publique) |
| Cartes Communauté : badges Membre / Organisateur | Retirés ✅ |
| Mon espace communautés : « En attente » bandeau superposé haut de cover (`bg-stone-950/85`) + cadre ambre | Conservé ✅ (pattern « bandeau sur cover ») |
| Page Communauté : dots + Brouillon | Conservé ✅ |

Bilan : de ~8 badges de statut/rôle à **5 signaux d'exception** (Annulé, Brouillon, En attente, Liste d'attente, Démo), tous rendus avec **un seul langage** de bandeau + cadre assorti.

## 8. Arbitrages — tranchés (2026-07-02)

1. **Explorer — badges perso** : **tout retirer**. Aucun badge Organisateur/Inscrit sur les cartes événement Explorer (découverte = nouveautés).
2. **Page Communauté — statut perso** : **signaler « En attente » / « Liste d'attente »** sur la timeline, en bandeau de tête (comme l'annulé), au-delà du simple dot. Le dot reste pour « Inscrit ».
3. **Mon espace événements — rôle** : le **filtre « Organisateur »** suffit, **pas de badge de rôle** par carte.
4. **Cadre assorti** : toute carte événement portant un bandeau d'exception reçoit le cadre de carte de la même teinte (annulé = destructif, en attente / liste d'attente = ambre).
