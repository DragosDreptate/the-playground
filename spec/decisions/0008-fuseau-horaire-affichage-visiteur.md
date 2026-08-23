# ADR-0008 — Affichage des dates dans le fuseau du visiteur, fuseau de l'événement stocké

- **Date** : 2026-08-23
- **Statut** : Accepté
- **Références** : issue #475, signalement d'un organisateur basé en Irlande (23/08/2026)

## Contexte

L'application n'a **aucune notion de fuseau horaire par événement**, et fait deux hypothèses contradictoires aux deux bouts de la chaîne :

| Bout de chaîne | Fuseau utilisé | Fichier |
|---|---|---|
| **Saisie** (organisateur) | fuseau du **navigateur** | `src/lib/time-options.ts` (`setHours`/`getHours`) |
| **Affichage** (visiteur) | `Europe/Paris` **codé en dur** | `src/lib/format-date.ts:12` |

Tant que l'organisateur saisit depuis la France pour un événement en France, les deux hypothèses s'alignent par coïncidence et tout est correct. Dès qu'un fuseau diverge, la chaîne casse.

Le problème est documenté depuis le **13/05/2026** dans l'issue #475 (enrichie le 03/06), à partir d'un screenshot pris depuis un fuseau GMT-6. Il n'avait jamais été tranché.

Le **23/08/2026**, un organisateur irlandais le signale sur son propre cas : il saisit un événement de 16:30 à 18:30 (heure de Dublin), le site l'affiche de 17:30 à 19:30. Le mécanisme est confirmé de bout en bout : saisie interprétée en heure de Dublin (UTC+1) → stockage **15:30 UTC** (correct) → réaffichage forcé en `Europe/Paris` (UTC+2) → 17:30. Son ajout à Google Calendar, lui, est juste : `src/lib/calendar.ts:14` exporte l'instant UTC brut et laisse l'agenda convertir. **Aucune donnée n'est corrompue en base — le défaut est purement un défaut d'affichage.**

Deux éléments de contexte pèsent sur la décision :

1. Une **demi-décision de fait** existait, jamais formalisée : `format-date.ts` assume `Europe/Paris` (« *For a France-first app, Europe/Paris is the appropriate default* »), et début juillet 2026 le badge « Aujourd'hui » a été délibérément corrigé du fuseau navigateur vers `isSameDayInParis` pour supprimer les incohérences entre surfaces.
2. La plateforme accueille désormais des organisateurs hors de France, ce qui invalide la prémisse « France-first » de cette demi-décision.

## Décision

1. **L'affichage web se fait dans le fuseau du visiteur.** `Europe/Paris` cesse d'être le fuseau de rendu. L'heure est affichée **seule, sans mention du fuseau** (« 17:30 », pas « 17:30 CEST »).
2. **Un fuseau horaire est stocké par événement** (nouveau champ `timezone` sur `Moment`, identifiant IANA type `Europe/Dublin`), capté à la saisie depuis le navigateur de l'organisateur.
3. **Les emails, rappels et notifications Slack affichent l'heure locale de l'événement, avec mention explicite du fuseau** — ces surfaces sont générées côté serveur, sans visiteur ni fuseau connu, et ne peuvent donc pas appliquer la règle 1.
4. **L'export ICS / calendrier reste inchangé** : instant UTC, conversion déléguée à l'agenda du destinataire. C'était déjà le seul maillon correct de la chaîne.
5. **Le stockage reste en UTC** (`DateTime` Prisma). Rien ne change côté persistance des instants.

## Alternatives écartées

- **Assumer `Europe/Paris` comme fuseau de référence unique** (et corriger la saisie pour l'interpréter aussi en heure de Paris) — cohérent de bout en bout et sans migration, mais ferme la porte aux communautés hors de France, alors que le cas est déjà réel.
- **Afficher dans le fuseau de l'événement** (« 16:30 IST » pour tout le monde) — c'est le choix de Luma et Meetup. Écarté au profit du confort du lecteur : le visiteur voit directement l'heure qui le concerne, sans calcul mental.
- **Afficher les deux heures quand elles diffèrent** (« 16:30 IST · 17:30 chez vous ») — lève toute ambiguïté, mais alourdit chaque surface d'affichage de date. Écarté au profit de la sobriété.
- **Garder `Europe/Paris` dans les emails avec une mention explicite** (sans stocker de fuseau, donc sans migration) — écarté : l'email et le site auraient affiché deux heures différentes pour le même événement, c'est-à-dire exactement le symptôme signalé.

## Conséquences

- **Positives** : le symptôme signalé disparaît pour tout visiteur, où qu'il soit. La plateforme devient utilisable par des organisateurs hors de France. Les deux hypothèses contradictoires saisie/affichage sont réconciliées par une source unique et explicite (le fuseau stocké). Les emails deviennent enfin non ambigus.

- **Négatives / coûts** :
  - **Ambiguïté assumée sur le web** (règle 1, choix explicite) : rien n'indique dans quel fuseau l'heure affichée est exprimée. Un participant qui consulte la page depuis un fuseau puis se déplace vers le lieu de l'événement verra une heure qui n'est pas celle de l'horloge sur place, sans avertissement. Le garde-fou est reporté sur les emails (règle 3), qui portent la mention. **Point de réévaluation** : si des participants se présentent à la mauvaise heure, revenir sur cette règle (les options « fuseau affiché » et « double affichage » restent ouvertes, le fuseau stocké les rend implémentables sans nouvelle migration).
  - **Asymétrie web / email assumée** : le site affiche l'heure du lecteur sans étiquette, l'email l'heure de l'événement avec étiquette. Deux surfaces, deux heures possibles pour le même événement. C'est le prix de l'absence de fuseau connu côté serveur.
  - Migration de schema (`timezone` sur `Moment`) : `db:push` sur les **deux** branches Neon (dev et prod) + backfill des événements existants.
  - `Europe/Paris` est codé en dur dans **4 fichiers** (`format-date.ts`, `format-moment-email.ts`, `build-reminder-email-data.ts`, `notify-new-moment.ts`) plus `i18n/request.ts` : le chantier touche page événement, timeline, cartes, emails et notifications.

- **Risques mitigés** :
  - **Mismatch d'hydratation / flash au chargement** → les pages Explorer (ISR 300s) et Communauté (ISR 60s) sont mises en cache : un HTML caché ne peut pas contenir une heure propre au visiteur. Le formatage doit donc être client-side, éventuellement amorcé par le header `x-vercel-ip-timezone` de Vercel puis corrigé au montage. **Ce risque n'est pas théorique** : le badge « Aujourd'hui » a déjà fait trois allers-retours en juillet 2026 sur exactement ce sujet (fuseau navigateur → Paris au render → mismatch ISR → `useEffect`).
  - **Horloge mal réglée / VPN** → l'heure affichée suit l'appareil du visiteur, qui peut mentir. Borné : le fuseau de l'événement reste la vérité, disponible en base et dans les emails.

- **Ce que ça verrouille pour la suite** :
  - **Revirement explicite de la correction de juillet 2026** : le badge « Aujourd'hui » (`dashboard-moment-card.tsx`, `public-moment-card.tsx`) repasse du fuseau de Paris au fuseau du visiteur. `isSameDayInParis` n'est plus le helper canonique pour le web. **Ne pas « re-corriger » vers Paris** : ce serait rejouer le ping-pong.
  - `format-date.ts` perd sa constante `TIMEZONE` codée en dur ; toute nouvelle surface d'affichage de date doit passer par le helper client et non réintroduire un fuseau fixe.
  - Tout nouvel usage serveur d'une date d'événement (email, notification, export) doit lire le fuseau stocké de l'événement, jamais supposer Paris.
