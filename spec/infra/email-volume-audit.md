# Audit volume emails — The Playground

> **Date** : 2026-04-13
> **Objectif** : dresser un bilan de tous les emails envoyés par l'app, estimer le volume quotidien, et proposer des optimisations pour rester sous la limite Resend (100/jour en plan gratuit).

---

## Inventaire complet : 24 types d'emails

### Emails Participant (déclenchés par une action utilisateur)

| Email | Déclencheur | Destinataire | Volume | Préf. opt-out |
|-------|------------|-------------|--------|---------------|
| Confirmation d'inscription | Inscription à un événement | 1 Participant | 1 | Non |
| Promotion liste d'attente | Place libérée | 1 Participant | 1 | Non |
| Mise à jour événement | Date/lieu modifié | N inscrits + Organisateurs | 1 par destinataire | Non |
| Annulation événement | Événement supprimé | N inscrits (tous statuts) | 1 par inscrit | Non |
| Inscription retirée par l'Organisateur | Organisateur retire un inscrit | 1 Participant | 1 | Non |
| Membre retiré de la Communauté | Organisateur retire un membre | 1 Participant | 1 | Non |
| Approbation/rejet inscription | Organisateur valide ou refuse | 1 Participant | 1 | Non |
| Invitation Communauté | Organisateur invite par email | N invités | 1 par invité | Non |
| Rappel 24h | Cron horaire | N inscrits par événement | 1 par inscrit | Non |
| Onboarding (lettre fondateur) | Cron quotidien (J+1, min 3h) | 1 nouvel utilisateur | 1 | Non |

### Emails Organisateur (notifications)

| Email | Déclencheur | Destinataire | Volume | Préf. opt-out |
|-------|------------|-------------|--------|---------------|
| Nouvelle inscription | Participant s'inscrit | N Organisateurs | 1 par Orga | `notifyNewRegistration` |
| Nouveau membre Communauté | Participant rejoint la Communauté directement (pas via événement) | N Organisateurs | 1 par Orga | `notifyNewRegistration` |
| Inscription en attente d'approbation | Inscription nécessitant validation | N Organisateurs | 1 par Orga | `notifyNewRegistration` |
| Annulation inscription payante | Participant annule (événement payant) | N Organisateurs | 1 par Orga | Non |
| Nouveau commentaire | Commentaire sur un événement | N inscrits + Organisateurs | 1 par destinataire | `notifyNewComment` |
| Confirmation de publication | Organisateur publie un événement | 1 Organisateur | 1 | Non |
| Nouvel événement dans la Communauté | Événement publié | N membres | 1 par membre | `notifyNewMomentInCircle` |
| Broadcast événement | Manuel (cooldown 24h) | N membres | 1 par membre | `notifyNewMomentInCircle` |

### Emails admin (internes)

| Email | Déclencheur | Destinataire | Volume |
|-------|------------|-------------|--------|
| Nouvelle Communauté créée | Création Circle | N admins | 1 par admin |
| Nouvel événement créé (brouillon) | Création Moment (DRAFT) | N admins | 1 par admin |
| Nouvel utilisateur | Complétion onboarding | N admins | 1 par admin |
| Alerte Sentry | Webhook Sentry | 1 admin | 1 |

### Emails auth / divers

| Email | Déclencheur | Volume |
|-------|------------|--------|
| Magic link | Connexion | 1 |
| Formulaire de contact | Soumission (rate limit 5/15min) | 1 |

---

## Point important : pas de doublon inscription + nouveau membre

Quand un Participant s'inscrit à un événement et devient automatiquement membre de la Communauté, l'Organisateur ne reçoit **qu'un seul email** (notification de nouvelle inscription). L'email "nouveau membre Communauté" (`sendHostNewCircleMember`) n'est déclenché que quand un utilisateur rejoint directement une Communauté depuis la page Communauté, pas via une inscription à un événement.

---

## Simulation : journée type avec activité réelle

**Hypothèse** : 1 Communauté de 50 membres, 2 Organisateurs, 1 événement publié, 15 inscriptions, 5 commentaires, 2 nouveaux utilisateurs, 3 admins.

| Action | Calcul | Emails |
|--------|--------|--------|
| Publication de l'événement | 1 (Orga) + 50 (membres) | **51** |
| 15 inscriptions | 15 × (1 conf + 2 notifs Orga) = 15 × 3 | **45** |
| 5 commentaires | 5 × ~17 destinataires (inscrits + Orga moyens) | **85** |
| 2 nouveaux utilisateurs | 2 × (1 magic link + 3 admins) | **8** |
| 1 brouillon créé | 1 × 3 admins | **3** |
| **TOTAL** | | **~192** |

**La limite Resend de 100/jour est dépassée dès qu'il y a de l'activité.** Répartition : commentaires (44%), publication événement (27%), inscriptions (23%), admin (6%).

---

## Recommandations pour réduire le volume

### Priorité 1 — Quick wins (faible complexité)

| Optimisation | Gain estimé/jour | Complexité |
|-------------|-----------------|------------|
| **Ne pas notifier les admins sur les brouillons** — notifier uniquement à la publication (PUBLISHED) | -3 à -5 | Triviale (condition sur le statut) |

### Priorité 2 — Impact moyen

| Optimisation | Gain estimé/jour | Complexité |
|-------------|-----------------|------------|
| **Digest inscriptions Organisateur** — au lieu d'1 email par inscription, envoyer un résumé périodique (horaire ou quotidien) : "15 nouvelles inscriptions à [événement]" | -20 à -30 | Moyenne (cron + table buffer) |

### Priorité 3 — Fort impact, plus complexe

| Optimisation | Gain estimé/jour | Complexité |
|-------------|-----------------|------------|
| **Digest commentaires** — accumuler les commentaires et envoyer un digest "N nouveaux commentaires sur [événement]" toutes les 2-4h au lieu de 1 email par commentaire | -70 à -80 | Moyenne (cron + table buffer) |

### Priorité 4 — À évaluer

| Optimisation | Gain estimé/jour | Complexité |
|-------------|-----------------|------------|
| **Digest admin quotidien** — remplacer les emails admin unitaires (nouvelle entité, nouvel utilisateur) par un résumé quotidien | -5 à -10 | Basse (cron simple) |

### Résumé des gains

| Scénario | Emails/jour estimés |
|----------|-------------------|
| Aujourd'hui (sans optimisation) | ~192 |
| + Quick wins (pas de notif brouillon) | ~187 |
| + Digest inscriptions Organisateur | ~160 |
| + Digest commentaires | ~80 |
| + Digest admin | ~70 |

Avec les 4 optimisations, le volume passe sous la limite Resend de 100/jour pour la plupart des scénarios d'usage normal.

---

## Préférences de notification existantes

3 préférences utilisateur déjà implémentées (`notificationPreferences` dans le profil) :

| Préférence | Emails concernés | Défaut |
|-----------|-----------------|--------|
| `notifyNewRegistration` | Nouvelle inscription, nouveau membre Communauté, inscription en attente | `true` |
| `notifyNewComment` | Nouveau commentaire sur un événement | `true` |
| `notifyNewMomentInCircle` | Nouvel événement publié, broadcast | `true` |

Ces préférences réduisent le volume uniquement si les utilisateurs les désactivent (opt-out). Elles ne remplacent pas les optimisations de digest côté serveur.

---

## Limite Resend — plan gratuit

- **100 emails/jour** — c'est la limite la plus susceptible d'être atteinte en premier
- 3 000 emails/mois
- Passage au plan payant : 20$/mois pour 50 000 emails

Voir aussi `spec/infra/email-service-alternatives.md` pour les alternatives européennes évaluées.
