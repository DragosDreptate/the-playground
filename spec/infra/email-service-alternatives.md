# Analyse — Alternatives européennes à Resend pour l'email transactionnel

> **Date** : 2026-04-13
> **Contexte** : The Playground utilise Resend (plan gratuit) pour tous les emails transactionnels. Analyse de faisabilité pour migrer vers un service européen (souveraineté RGPD).
> **Décision** : rester sur Resend. Réévaluer si exigence RGPD stricte sur les sous-traitants non-EU.

---

## Usage actuel de Resend

- **24 types d'emails** (17 unitaires + 6 batch), **21 templates React Email**
- **6 points d'intégration** : service principal, contact form, auth magic link, 2 crons PostHog, alertes Sentry
- **Features utilisées** : `emails.send()`, `batch.send()`, pièces jointes .ics (base64), filtrage demo
- **Volume estimé** : 50-200/jour en baseline, pics possibles sur les événements
- **Architecture** : port `EmailService` (domaine) → adapter `ResendEmailService` (infra). Migration = nouvel adapter.

---

## Comparatif des alternatives européennes

### Top 3

| Critère | Scaleway TEM | Lettermint | Mailjet |
| --- | --- | --- | --- |
| **Pays** | **France** (Iliad/Free) | Pays-Bas | **France** (Sinch/Suède) |
| **Data hosting** | Paris, 100% FR | 100% UE | UE |
| **Gratuit** | 300/mois | 300/mois | 6 000/mois (200/jour) |
| **Branding forcé** | Non | Non | Oui (plan gratuit) |
| **SDK Node.js** | `@scaleway/sdk` | `lettermint` (TS natif) | `node-mailjet` (mature) |
| **React Email** | Intégration officielle | `.html()` dans le SDK | HTML brut via API |
| **Batch API** | **Non** | À vérifier | Oui |
| **1er plan payant** | 0,25€/1000 (pay-as-you-go) | 10€/mois (10K) | 17$/mois (15K) |
| **Maturité** | Solide (infra Scaleway) | Jeune (risque) | Très mature (15+ ans) |

### Autres options viables

| Service | Pays | Gratuit | Point fort | Point faible |
| --- | --- | --- | --- | --- |
| **Sweego** | France | 100/jour (~3K/mois) | FR, multi-canal (email+SMS) | Pas de SDK npm |
| **Elastic Email** | Pologne | 100/jour | Très bon prix en volume | Branding forcé (gratuit) |
| **EmailLabs** | Pologne | 300/jour (9K/mois) | Tier gratuit généreux | Pas de SDK, niche CEE |
| **MailPace** | UK (data EU) | ~100/mois | Privacy-first, zéro tracking | Tier gratuit très limité |

### Services exclus (non européens)

Postmark (USA), Loops (USA), Mailtrap (Ukraine), Amazon SES (USA), Mailgun (USA/Sinch).

---

## Deep dive — Scaleway TEM

### Ce qui fonctionne

- **Souveraineté** : français, données à Paris, ISO 27001
- **React Email** : intégration officielle documentée (pré-rendu HTML via `render()`)
- **Pièces jointes .ics** : supporté (base64, `text/calendar`)
- **SMTP** : disponible — permet Nodemailer pour NextAuth
- **Webhooks** : 8 types d'événements (delivery, bounce, spam...)
- **Pricing** : 0,25€/1000 au-delà du gratuit — très compétitif

### Ce qui bloque

| Problème | Sévérité | Impact |
| --- | --- | --- |
| **Pas de batch API** | Haute | Pas d'équivalent à `resend.batch.send()`. 100 appels individuels pour 100 emails. Impacte 6 méthodes batch. |
| **Free tier 10x plus petit** | Haute | 300/mois vs 3 000 chez Resend |
| **API en ****`v1alpha1`** | Moyenne | Risque de breaking changes |
| **Minimum 10 caractères** | Basse | Le champ `text` ne peut pas être vide |
| **Pré-rendu obligatoire** | Basse | `render(<Template />)` avant chaque envoi |

### Effort de migration estimé

~12h de dev + 48h d'attente DNS.

---

## Deep dive — Brevo (ex-Sendinblue)

### Ce qui fonctionne

- **Entreprise française**, données EU, ISO 27001
- **Free tier généreux** : 300 emails/jour (~9 000/mois) — 3x Resend
- **API REST + SMTP** disponibles sur plan gratuit
- **Batch sending** : `messageVersions` (1 000/requête)
- **SDK Node.js** : `@getbrevo/brevo` v5 (TypeScript, activement maintenu)
- **RGPD** : DPA disponible, certifié

### Ce qui bloque

| Problème | Sévérité | Impact |
| --- | --- | --- |
| **Badge "Sent with Brevo" obligatoire** | **Rédhibitoire** | Incompatible avec le positionnement premium. Retrait = Starter 25€ + add-on 9$/mois. |
| **DX inférieure à Resend** | Moyenne | API plus verbeuse, pas d'intégration React Email native |

---

## Comparaison Resend vs alternatives — verdict

| Critère | Resend (actuel) | Scaleway TEM | Brevo | Lettermint |
| --- | --- | --- | --- | --- |
| **Free tier** | **3 000/mois** | 300/mois | 9 000/mois | 300/mois |
| **Branding** | **Aucun** | Aucun | Obligatoire | Aucun |
| **Batch API** | **Oui** | Non | Oui | À vérifier |
| **DX / SDK** | **Excellent** | Correct | Correct | Bon |
| **React Email** | **Natif** | Officiel (pré-rendu) | Indirect | Indirect |
| **RGPD / EU** | US, AWS | **FR, Paris** | **FR, EU** | NL, EU |
| **1er plan payant** | 20$/mois (50K) | ~2,50€ (10K) | 34€/mois (20K) | 10€/mois (10K) |

### Décision : rester sur Resend

**Raisons :**
1. Meilleure DX (SDK natif React Email, batch API, TypeScript-first)
2. Free tier le plus adapté au volume actuel (3 000/mois)
3. Aucun branding forcé
4. Zéro effort de migration
5. L'architecture hexagonale (port `EmailService`) permet de migrer à tout moment

### Quand réévaluer

- **Limite quotidienne Resend atteinte (100/jour)** → Resend payant (20$/mois) ou Scaleway pay-as-you-go. C'est la limite la plus probable à toucher en premier (un seul événement avec 50+ inscrits peut générer 100+ emails le même jour : confirmations, notifications organisateur, rappels).
- **Exigence RGPD stricte** (audit, sous-traitants non-EU interdits) → Scaleway TEM
- **Lettermint mûrit** (track record délivrabilité, batch API) → réévaluer comme alternative DX-first EU

---

## Références

- [Scaleway TEM docs](https://www.scaleway.com/en/docs/managed-services/transactional-email/)
- [Scaleway TEM API](https://www.scaleway.com/en/developers/api/transactional-email/)
- [React Email × Scaleway](https://react.email/docs/integrations/scaleway)
- [Brevo pricing](https://www.brevo.com/fr/pricing/)
- [Brevo API](https://developers.brevo.com/reference/send-transac-email)
- [Lettermint](https://lettermint.email/)
- [Mailjet](https://www.mailjet.com/)
