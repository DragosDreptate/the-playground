# Feature — Invitation en masse (bulk invite)

**Statut :** Analyse réalisée — décision reportée après MVP
**Date :** 2026-03-11
**Contexte :** Un organisateur qui migre une communauté de ~500 personnes demande à pouvoir les inviter en masse, via email ou WhatsApp.

---

## Ce qui existe déjà

L'infrastructure est en place. La plateforme a déjà :

- Un **lien d'invitation privé** (token UUID) générable et révocable par l'Organisateur
- Une **invitation email batch** (`inviteToCircleByEmailAction`) qui accepte un tableau d'emails et envoie en parallèle via Resend
- Un **template email d'invitation** avec le nom de la Communauté et un CTA

Le problème est uniquement **l'UX** : l'interface actuelle (`circle-share-invite-card.tsx`) ajoute les emails un par un (champ dynamique). Pour 500 personnes, c'est impraticable.

---

## Options analysées

### Option A — Textarea "coller en masse" (paste bulk)

Remplacer les champs dynamiques par un `<textarea>` où l'Organisateur colle ses 500 emails séparés par virgule, point-virgule ou retour à la ligne.

**Pour**
- Zéro backend à changer — `inviteToCircleByEmailAction` accepte déjà un tableau
- UX immédiate : copier depuis Excel/Google Sheets/son CRM → coller → envoyer
- Implémentation UI de ~2h
- Validation côté client (détecter les emails invalides, afficher le compte)

**Contre**
- Aucune confirmation visuelle des 500 contacts avant envoi
- Si 1 email invalide au milieu, l'UX de correction est frustrante
- Pas de déduplication visible (l'utilisateur ne sait pas si certains sont déjà membres)

**Limites**
- Resend Free : 100 emails/jour, 3 000/mois. 500 invitations = dépassement immédiat si plan gratuit
- Fire-and-forget actuel : pas de feedback sur les bounces/erreurs par email
- Pas de gestion des doublons visuellement (backend idempotent mais l'Organisateur ne le voit pas)

---

### Option B — Import CSV

Uploader un fichier `.csv` contenant une colonne `email` (et optionnellement `prenom`, `nom`).

**Pour**
- Workflow naturel pour qui a exporté sa communauté depuis Meetup/Eventbrite/Airtable
- Peut personnaliser l'email d'invitation avec le prénom (meilleur taux d'ouverture)
- Permet une prévisualisation avant envoi (tableau des contacts détectés)
- Réutilise l'infra Vercel Blob (upload) ou parsing côté client (plus simple)

**Contre**
- Plus complexe à implémenter (parsing CSV, validation, preview)
- Nécessite un nouveau port/adapter si parsing serveur
- UX import de fichier = plus de friction que le paste
- La personnalisation email nécessite de modifier le template et le port `EmailService`

**Limites**
- Même limite Resend que l'option A (critique à 500)
- Les colonnes CSV varient selon la source (Meetup exporte différemment d'Eventbrite)

---

### Option C — Lien d'invitation partageable (déjà en place) via WhatsApp

L'Organisateur **copie le lien d'invitation** existant et le partage lui-même dans son groupe WhatsApp, Slack, Telegram, etc.

**Pour**
- Déjà implémenté à 100% — aucun dev nécessaire
- WhatsApp naturel pour les communautés de 500 personnes (groupe existant)
- Taux de conversion supérieur (lien partagé par quelqu'un de confiance dans le groupe)
- Aucune limite de volume (Resend n'est pas impliqué)
- L'Organisateur contrôle le message d'accompagnement

**Contre**
- Pas d'automatisation — l'Organisateur doit copier/coller manuellement
- Pas de tracking des conversions (on ne sait pas qui a cliqué vs. qui a rejoint)
- Lien révocable = si révoqué, les anciens liens ne fonctionnent plus

**Limites**
- Si la communauté est sur plusieurs groupes WhatsApp, il faut partager plusieurs fois
- Aucune visibilité côté plateforme sur le taux d'adoption

---

### Option D — WhatsApp Business API (envoi automatisé)

Intégration native avec la Meta WhatsApp Business Platform pour envoyer des messages d'invitation directement depuis la plateforme, avec le numéro de téléphone de chaque contact.

**Pour**
- Taux d'ouverture WhatsApp ~98% vs ~25% email
- Expérience premium, différenciant fort vs Meetup/Luma
- Workflow complet : import numéros → envoi template approuvé → lien invitation

**Contre**
- Complexité massive : compte Meta Business vérifié, numéro d'envoi dédié, templates approuvés par Meta (délai 24-48h), gestion des opt-out légaux
- Coût : ~0.05-0.08€/message en Europe = 25-40€ pour 500 messages
- L'Organisateur doit avoir les numéros de téléphone de ses membres (RGPD)
- Délai d'implémentation : plusieurs semaines + review Meta

**Limites**
- Hors MVP — infrastructure technique et légale trop lourde
- Le RGPD impose un opt-in explicite pour les messages marketing WhatsApp

---

### Option E — Upgrade Resend + queue d'envoi

Résoudre le problème de volume email à la racine : passer Resend en plan payant (50k/mois ≈ 20$/mois) + implémenter une queue d'envoi avec retry et rapport de délivrabilité.

**Pour**
- Résout le problème de volume pour toutes les options email (A, B)
- Rapport de délivrabilité (bounces, opens) dans le dashboard Resend
- Fond de plateforme robuste pour tous les usages futurs (broadcast, notifications)

**Contre**
- Coût récurrent ($20+/mois) à décider au niveau produit
- Ne résout pas l'UX (l'option A ou B reste nécessaire en complément)

**Limites**
- Sans queue/batch, 500 emails en fire-and-forget = risque timeout Vercel (limite 60s function)
- Nécessite une refonte de `inviteToCircleByEmailAction` pour les grands volumes

---

## Recommandation

**Court terme (impact immédiat, 0 coût) :**
→ **Option C** — Orienter l'Organisateur vers le lien d'invitation existant qu'il partage dans son groupe WhatsApp. Solution la plus directe pour une migration de communauté.

**Moyen terme (1-2 sprints) :**
→ **Option A** (paste bulk) + **Option E** (upgrade Resend + batch processing). L'Organisateur colle ses 500 emails, la plateforme envoie en batch avec retry. L'UI change peu, le backend est déjà prêt conceptuellement.

**Long terme (post-MVP) :**
→ **Option B** (import CSV) si les organisateurs viennent massivement de Meetup/Eventbrite.
→ **Option D** (WhatsApp API) uniquement si on décide de se différencier fortement sur ce canal — avec un modèle économique qui le justifie.

---

## Point critique : la limite Resend

**C'est le vrai bloquant.** Avec le plan actuel, 500 invitations email = dépassement quasi-certain. Avant de mettre en place une belle UX de bulk invite, il faut décider du plan Resend et implémenter le batch avec gestion d'erreurs propre. Sans ça, on crée une UX qui promet quelque chose que l'infra ne peut pas tenir.

---

## Fichiers clés (existants)

| Fichier | Rôle |
|---|---|
| `src/app/actions/circle.ts` | `inviteToCircleByEmailAction` — accepte déjà `emails: string[]` |
| `src/components/circles/circle-share-invite-card.tsx` | UI invitation (à modifier pour paste bulk) |
| `src/domain/ports/services/email-service.ts` | Port `sendCircleInvitation` |
| `src/infrastructure/services/email/templates/circle-invitation.tsx` | Template email invitation |
| `src/domain/usecases/generate-circle-invite-token.ts` | Génération token lien d'invitation |
