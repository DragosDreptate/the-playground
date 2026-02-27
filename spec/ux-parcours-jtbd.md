# Parcours utilisateurs & Jobs To Be Done — The Playground

> Document d'analyse UX exhaustif. Cartographie les personas, leurs JTBD, leurs points
> d'entrée, leurs parcours complets, et identifie les lacunes de l'expérience actuelle.
>
> État du produit au moment de la rédaction : **2026-02-21** (MVP en cours).

---

## 1. Typologies d'utilisateurs

### 1.1 Visiteur anonyme — Le Découvreur

**Qui** : Toute personne qui reçoit un lien `/m/[slug]` sans avoir de compte.

**Comment il arrive** : lien partagé par WhatsApp, SMS, email, Instagram story, Slack, LinkedIn.

**Ce qu'il sait** : rien sur The Playground. Il sait juste qu'un ami ou une connaissance lui a envoyé un lien.

**Ce qu'il cherche** : comprendre en 10 secondes de quoi il s'agit, évaluer si ça lui correspond, et s'inscrire si oui — sans friction.

**Sensibilité clé** : la moindre friction (formulaire long, compte obligatoire avant de voir le contenu) le fera partir.

---

### 1.2 Participant fraîchement inscrit — Le Nouveau Membre

**Qui** : Quelqu'un qui vient de créer un compte et de s'inscrire à son premier événement.

**Comment il arrive** : il venait d'un lien `/m/[slug]`, a fait l'auth (magic link ou OAuth), a peut-être rempli l'onboarding profil, et est maintenant inscrit.

**Ce qu'il sait** : il connaît l'événement. Il ne connaît pas encore la plateforme ni la communauté.

**Ce qu'il cherche** : confirmation que son inscription est bien prise en compte, et une réponse à "Et maintenant ?"

**Sensibilité clé** : l'absence de feedback clair après l'inscription est anxiogène.

---

### 1.3 Participant récurrent — Le Membre Actif

**Qui** : Membre d'une ou plusieurs Communautés, qui revient régulièrement sur la plateforme.

**Comment il arrive** : email de rappel (non encore implémenté), notification, ou directement par habitude.

**Ce qu'il cherche** :
- Vue rapide de ses prochains événements
- Ne pas rater les nouveaux événements de ses Communautés
- Consulter les informations pratiques d'un événement imminent (lieu exact, heure, lien visio)
- Gérer ses inscriptions (annuler si nécessaire)

**Sensibilité clé** : il ne veut pas perdre de temps à naviguer pour trouver ce dont il a besoin.

---

### 1.4 Participant en liste d'attente — Le Candidat

**Qui** : Participant inscrit sur un événement complet, en attente d'un désistement.

**Comment il arrive** : s'est inscrit sur un événement complet, ou vient de recevoir une notification.

**Ce qu'il cherche** : savoir s'il a une place, et gérer son inscription.

**Sensibilité clé** : l'incertitude est inconfortable. L'absence de notification de promotion est un abandon certain.

---

### 1.5 Organisateur débutant — L'Organisateur en découverte

**Qui** : Quelqu'un qui veut organiser des événements et évalue si The Playground peut remplacer Meetup ou Luma.

**Comment il arrive** : bouche-à-oreille, article, recommandation d'un autre Organisateur.

**Ce qu'il cherche** :
- Comprendre rapidement ce que la plateforme propose
- Créer sa première Communauté et son premier événement rapidement
- Partager le lien et voir si ça "marche"

**Sensibilité clé** : le time-to-first-event doit être minimal. Si c'est compliqué, il reste sur Luma.

---

### 1.6 Organisateur actif — L'Organisateur communautaire

**Qui** : Organise régulièrement des événements dans une ou plusieurs Communautés. Sa communauté est établie.

**Comment il arrive** : directement sur le dashboard, par habitude.

**Ce qu'il cherche** :
- Créer de nouveaux événements rapidement
- Voir qui est inscrit, gérer la liste d'attente
- Partager le lien du prochain événement
- Voir l'engagement de sa communauté (commentaires, inscriptions)

**Sensibilité clé** : il a besoin d'efficacité. Chaque clic inutile dans le dashboard est une friction.

---

### 1.7 Organisateur pré-événement — L'Organisateur en mode préparation

**Qui** : Organisateur dont l'événement est dans les 48h à venir.

**Ce qu'il cherche** :
- Vérifier le nombre de confirmés
- Envoyer des rappels (non implémenté)
- Modifier les infos pratiques si nécessaire (lieu de repli, heure changée)
- Avoir le lien partageable à portée pour les latecomers

**Sensibilité clé** : la pression pré-événement est forte. L'interface doit répondre aux questions sans chercher.

---

### 1.8 Organisateur post-événement — L'Organisateur en mode rétention

**Qui** : Organisateur dont l'événement vient de se terminer (statut PAST).

**Ce qu'il cherche** :
- Lire les commentaires de remerciement
- Annoncer le prochain événement
- Analyser la participation (qui est venu, taux de présence)
- Capitaliser sur la dynamique post-événement pour fidéliser les membres

**Sensibilité clé** : la fenêtre d'engagement post-événement est courte (24-48h). Si rien ne relance, les membres décrochent.

---

## 2. Jobs To Be Done (JTBD) par persona

> Format : "**Quand** [contexte], **je veux** [action/capacité], **pour** [résultat attendu]."

### Visiteur anonyme
1. **Quand** je reçois un lien d'événement sur mobile, **je veux** comprendre en 10 secondes ce que c'est, **pour** décider si ça vaut mon attention.
2. **Quand** je veux y aller, **je veux** m'inscrire en moins de 2 minutes, **pour** ne pas perdre ma motivation dans un formulaire.
3. **Quand** je m'inscris, **je veux** recevoir une confirmation immédiate, **pour** être sûr que c'est fait.

### Participant fraîchement inscrit
4. **Quand** je viens de m'inscrire, **je veux** savoir ce qui m'attend (détails pratiques, autres participants), **pour** me projeter dans l'événement.
5. **Quand** je découvre cette communauté, **je veux** comprendre ce qu'elle propose au-delà de cet événement, **pour** décider si je veux rester impliqué.
6. **Quand** j'ai créé mon compte, **je veux** pouvoir revenir facilement sur la plateforme, **pour** retrouver mes informations sans chercher.

### Participant récurrent
7. **Quand** j'ouvre l'app, **je veux** voir mes prochains événements d'un coup d'œil, **pour** ne pas oublier ce qui m'attend.
8. **Quand** un événement approche, **je veux** retrouver facilement les informations pratiques (adresse, heure, lien visio), **pour** y aller sans stress.
9. **Quand** mes plans changent, **je veux** annuler mon inscription rapidement, **pour** libérer ma place à quelqu'un en attente.
10. **Quand** un nouvel événement est créé dans une de mes Communautés, **je veux** en être informé, **pour** m'inscrire avant que ce soit complet.

### Participant en liste d'attente
11. **Quand** je suis sur liste d'attente, **je veux** savoir ma position et la probabilité d'obtenir une place, **pour** décider si je garde espoir ou planifie autre chose.
12. **Quand** une place se libère, **je veux** en être notifié immédiatement, **pour** confirmer avant que quelqu'un d'autre le fasse.

### Organisateur débutant
13. **Quand** je découvre la plateforme, **je veux** créer mon premier événement en moins de 5 minutes, **pour** valider que c'est fait pour moi avant d'investir.
14. **Quand** j'ai publié mon événement, **je veux** partager le lien facilement, **pour** que mes contacts s'inscrivent.
15. **Quand** mes premiers inscrits arrivent, **je veux** en être notifié, **pour** rester motivé et valider que ça fonctionne.

### Organisateur actif
16. **Quand** je crée un événement, **je veux** le faire rapidement sans remplir 20 champs, **pour** me concentrer sur la préparation de l'événement lui-même.
17. **Quand** mon événement est publié, **je veux** accéder au lien partageable en un clic, **pour** le diffuser immédiatement.
18. **Quand** je veux connaître mon audience, **je veux** voir la liste des inscrits avec leurs informations, **pour** me préparer et adapter l'événement.
19. **Quand** un membre annule, **je veux** que la liste d'attente soit gérée automatiquement, **pour** ne pas m'en occuper manuellement.

### Organisateur pré-événement
20. **Quand** mon événement est dans 48h, **je veux** voir le nombre de confirmés en temps réel, **pour** anticiper la logistique.
21. **Quand** les informations changent, **je veux** modifier l'événement rapidement, **pour** que les inscrits aient les bonnes infos.
22. **Quand** je veux rappeler à mes inscrits de venir, **je veux** envoyer un message groupé, **pour** maximiser le taux de présence.

### Organisateur post-événement
23. **Quand** mon événement est terminé, **je veux** remercier et interagir avec les participants, **pour** renforcer le lien communautaire.
24. **Quand** ma communauté est encore engagée, **je veux** annoncer le prochain événement, **pour** capitaliser sur l'élan.
25. **Quand** j'analyse mon événement, **je veux** connaître le taux de présence et l'engagement, **pour** améliorer les prochains.

---

## 3. Points d'entrée

| Point d'entrée | Persona(s) | Déclencheur |
|----------------|------------|-------------|
| `/m/[slug]` | Visiteur anonyme, Participant non-inscrit | Lien partagé (WhatsApp, email, réseaux) |
| `/m/[slug]` (connecté) | Participant inscrit, Participant en liste d'attente | Email de confirmation / rappel |
| `/dashboard` | Participant récurrent, Organisateur actif | Habitude, favoris, email |
| `/dashboard/circles/[slug]` | Organisateur actif, Participant récurrent | Navigation dashboard |
| `/dashboard/circles/[slug]/moments/[slug]` | Organisateur pré/post-événement | Gestion d'un événement spécifique |
| Email de confirmation | Participant fraîchement inscrit | Post-inscription |
| Email de rappel | Participant récurrent, Participant en liste d'attente | 24h/1h avant |
| Email promotion liste d'attente | Participant en liste d'attente | Désistement d'un inscrit |
| Page marketing (non construite) | Organisateur débutant | Bouche-à-oreille, SEO |

---

## 4. Parcours détaillés

### Parcours A — Découverte virale : du lien au premier engagement

**Persona** : Visiteur anonyme → Participant fraîchement inscrit
**Déclencheur** : réception d'un lien événement sur mobile
**Fréquence** : entrée principale sur la plateforme, critique pour la croissance

```
[Lien reçu] → /m/[slug] → [Lecture du contenu] → [Décision]
                                                       ↓ Oui
                                              [Clic "S'inscrire"]
                                                       ↓
                                              [Auth (magic link / OAuth)]
                                                       ↓
                                              [Onboarding profil — 1ère fois]
                                                       ↓
                                              [Retour /m/[slug] → Inscrit ✓]
                                                       ↓
                                              [Et maintenant ?]  ← GAP ACTUEL
```

**État actuel (implémenté) :**
- Page événement publique : titre, date, lieu, description, inscrits, commentaires ✓
- Bouton d'inscription avec gestion capacité/liste d'attente ✓
- Auth magic link + OAuth ✓
- Onboarding profil obligatoire ✓
- Retour sur la page après auth ✓
- Email de confirmation d'inscription ✓ (avec pièce jointe .ics)

**Gaps critiques :**

| # | Gap | Impact | Priorité |
|---|-----|--------|----------|
| A1 | ~~Post-inscription : aucun CTA "Ajouter au calendrier"~~ ✅ **Résolu** — composant `AddToCalendarButtons` (Google Calendar + fichier .ics via `/api/moments/[slug]/calendar`) affiché après inscription confirmée | ~~Le Player risque d'oublier l'événement~~ | ~~Haute~~ ✅ |
| A2 | Post-inscription : aucun lien visible vers le dashboard | Le Player ne sait pas qu'il a un espace personnel | Haute |
| A3 | ~~Pas d'email de confirmation d'inscription~~ ✅ **Résolu** — email de confirmation implémenté (Resend + react-email) | ~~Pas de réassurance, pas de rappel~~ | ~~Bloquante~~ ✅ |
| A4 | La page `/m/[slug]` ne propose pas d'autres événements de la Communauté (hors PAST) | Rétention Communauté manquée pour les événements actifs | Moyenne |
| A5 | L'onboarding ne distingue pas Organisateur et Participant | Un futur Organisateur n'est pas guidé vers la création de Communauté | Basse (post-MVP) |

---

### Parcours B — Retour régulier Participant

**Persona** : Participant récurrent
**Déclencheur** : habitude, email de rappel, notification
**Fréquence** : usage régulier post-inscription

```
[Accès direct /dashboard] → [Vue "Mes prochains événements"]
                                       ↓
                          [Clic sur un événement]
                                       ↓
                          [/dashboard/circles/[slug]/moments/[slug]]
                                       ↓
              ┌──────────────────────────────────────────────────┐
              │ Vérifier lieu/heure (pré-événement)              │
              │ Lire les commentaires                            │
              │ Annuler si nécessaire                            │
              └──────────────────────────────────────────────────┘
```

**État actuel (implémenté) :**
- Dashboard avec timeline "Mes prochains événements" ✓
- Lien vers l'événement dashboard ✓ (fix bug précédent)
- Détails de l'événement (lieu, heure, description) ✓
- Fil de commentaires ✓
- Bouton d'annulation ✓

**Gaps :**

| # | Gap | Impact | Priorité |
|---|-----|--------|----------|
| B1 | Pas d'email de rappel 24h/1h avant l'événement | Taux d'absence élevé (oubli) | ~~Bloquante~~ → **Déprioritisée Phase 2** (nécessite jobs planifiés Vercel Cron / QStash) |
| B2 | Depuis la page événement dashboard, aucune vue des autres événements de la même Communauté | Découverte limitée, rétention faible | Haute |
| ~~B3~~ | ~~Pas de notification quand un nouvel événement est créé dans une Communauté dont on est membre~~ ✅ **Résolu** — email `notifyNewMoment` envoyé à tous les membres à la création d'un événement, sauf au créateur (commit `80a1390`) | ~~Le Participant revient seulement s'il pense à venir~~ | ~~Haute~~ ✅ |
| B4 | Pas d'infos pratiques en format "résumé rapide" au-dessus de la ligne de flottaison sur mobile | Sur mobile, doit scroller pour trouver l'adresse | Moyenne |

---

### Parcours C — Gestion liste d'attente

**Persona** : Participant en liste d'attente
**Déclencheur** : s'est inscrit sur un événement complet

```
[/m/[slug] ou dashboard] → [Voir statut "Liste d'attente"]
                                       ↓
              ┌────────────────────────┴────────────────────────┐
              │ Attendre une notification (non implémentée)      │
              │ Revenir manuellement vérifier son statut         │
              └─────────────────────────────────────────────────┘
                                       ↓
                          [Désistement d'un inscrit]
                                       ↓
                          [Promotion automatique ✓]
                                       ↓
                          [Notification email ✅ implémentée]
```

**État actuel (implémenté) :**
- Inscription en liste d'attente ✓
- Badge "Liste d'attente" sur dashboard et timeline Communauté ✓
- Promotion automatique sur désistement ✓
- Email de notification de promotion ✓

**Gaps :**

| # | Gap | Impact | Priorité |
|---|-----|--------|----------|
| C1 | ~~Pas d'email de notification de promotion~~ ✅ **Résolu** — email de promotion liste d'attente implémenté | ~~Le Player ne sait pas qu'il a une place~~ | ~~Bloquante~~ ✅ |
| C2 | ~~Position dans la liste d'attente non visible~~ ✅ **Résolu** — calcul à la volée via `countWaitlistPosition`, affiché dans `RegistrationButton` sur `/m/[slug]` et dashboard | ~~Incertitude maximale~~ | ~~Haute~~ ✅ |
| C3 | Pas d'option "m'alerter si une place se libère" explicite | Le mécanisme est implicite, pas rassurant | Haute |

---

### Parcours D — Organisateur : créer et lancer un événement

**Persona** : Organisateur actif
**Déclencheur** : veut organiser un événement
**Fréquence** : récurrent, critique pour la rétention Host

```
[/dashboard] → [Bouton "Créer un événement"]
                        ↓
              [Formulaire : titre, date, lieu, description]
              [Options avancées masquées : capacité, prix]
                        ↓
              [Publication → slug généré → /m/[slug] créée]
                        ↓
              [Page événement dashboard → lien partageable visible]
                        ↓
              [Copie + partage WhatsApp/email/réseaux]
                        ↓
              [Premiers inscrits → notification email Host ✅]
```

**État actuel (implémenté) :**
- Bouton "Créer un événement" sur dashboard (si Organisateur) ✓
- Formulaire minimaliste avec options avancées ✓
- Génération de slug ✓
- Lien partageable avec bouton Copier sur la page événement dashboard ✓
- Auto-inscription de l'Organisateur à l'événement ✓
- Email de notification à l'Organisateur quand un Participant s'inscrit ✓

**Gaps :**

| # | Gap | Impact | Priorité |
|---|-----|--------|----------|
| D1 | ~~Pas d'email de notification quand quelqu'un s'inscrit~~ ✅ **Résolu** — notification Organisateur implémentée | ~~L'Organisateur ne sait pas que ça "marche"~~ | ~~Haute~~ ✅ |
| D2 | Le bouton "Créer un événement" n'est visible que si l'utilisateur est déjà Organisateur. Un Participant qui veut organiser n'a pas de CTA évident pour devenir Organisateur | Adoption Organisateur bloquée | Haute |
| D3 | Après création d'un événement, pas de step "Partagez maintenant" avec le lien en grand | Le partage n'est pas assez encouragé | Moyenne |
| D4 | L'événement est automatiquement lié à la Communauté de l'Organisateur, mais si l'Organisateur a plusieurs Communautés, la sélection dans le formulaire n'est pas évidente | Confusion multi-Communauté | Moyenne |
| D5 | Pas de moyen de programmer un événement (brouillon) avant de le publier | L'Organisateur doit tout remplir en une fois | Basse |

---

### Parcours E — Organisateur : gérer un événement (pré-événement)

**Persona** : Organisateur pré-événement
**Déclencheur** : événement dans les 48h

```
[/dashboard/circles/[slug]/moments/[slug]] → [Vue gestion événement]
                        ↓
              ┌──────────────────────────────────────────┐
              │ Voir liste des inscrits + waitlist        │
              │ Modifier infos pratiques si besoin        │
              │ Envoyer rappel groupé (non implémenté)    │
              │ Accéder au lien partageable               │
              └──────────────────────────────────────────┘
```

**État actuel (implémenté) :**
- Liste des inscrits avec avatars ✓
- Bouton Modifier ✓
- Lien partageable avec Copier ✓

**Gaps :**

| # | Gap | Impact | Priorité |
|---|-----|--------|----------|
| E1 | Pas de communication directe avec les inscrits depuis la plateforme | Le Host doit utiliser d'autres canaux pour les rappels | Bloquante (MVP) |
| E2 | La liste des inscrits ne distingue pas REGISTERED / WAITLISTED / CHECKED_IN | Vue incomplète | Haute |
| ~~E3~~ | ~~Pas d'export CSV des inscrits~~ ✅ **Résolu** — bouton "Exporter CSV" implémenté dans `RegistrationsList` (colonnes : prénom, nom, email, statut, date) | ~~Besoin logistique~~ | ~~Haute~~ ✅ |
| E4 | Pas de compteur "X inscrits confirmés / Y en attente / Z places restantes" affiché en un coup d'œil | Doit calculer mentalement | Moyenne |

---

### Parcours F — Organisateur : post-événement et rétention

**Persona** : Organisateur post-événement
**Déclencheur** : transition automatique PUBLISHED → PAST

```
[événement → statut PAST] → [Page événement en vue PAST]
                                    ↓
                [Lire les commentaires des participants]
                                    ↓
              ┌────────────────────────────────────────────┐
              │ Répondre / remercier (formulaire masqué !)  │ ← GAP
              │ Créer le prochain événement                 │
              │ Voir les stats de présence                  │ ← GAP
              └────────────────────────────────────────────┘
```

**État actuel (implémenté) :**
- Indicateurs visuels PAST (cover grisée, badge, banner) ✓
- Commentaires visibles en lecture ✓
- Carte "Événement terminé" avec CTA vers la Communauté ✓

**Gaps :**

| # | Gap | Impact | Priorité |
|---|-----|--------|----------|
| F1 | Formulaire de commentaire masqué sur les événements PAST **même pour l'Organisateur** | L'Organisateur ne peut pas remercier sa communauté | Haute |
| F2 | Pas de stats post-événement (taux d'inscription vs présence) | L'Organisateur ne peut pas mesurer l'efficacité | Moyenne |
| F3 | Pas de CTA "Créer le prochain événement" depuis la page PAST | Le moment de rebond est manqué | Haute |
| F4 | Pas de notification aux membres de la Communauté pour annoncer que le compte-rendu / les commentaires sont disponibles | Engagement post-événement faible | Moyenne |

---

### Parcours G — Onboarding nouvel Organisateur

**Persona** : Organisateur débutant, première visite
**Déclencheur** : recommandation, bouche-à-oreille

```
[Découverte plateforme] → [Création compte]
                                  ↓
                        [Onboarding profil]
                                  ↓
                        [Dashboard vide] → ???  ← GAP CRITIQUE
                                  ↓
                        [Trouver CTA "Créer une Communauté"]
                                  ↓
                        [Créer la Communauté]
                                  ↓
                        [Trouver CTA "Créer un événement"]
                                  ↓
                        [Premier événement publié]
                                  ↓
                        [Partager le lien]
```

**État actuel (implémenté) :**
- Onboarding profil obligatoire ✓
- Dashboard avec CTA "Créer une Communauté" si aucune Communauté ✓
- Formulaire création Communauté + événement ✓

**Gaps :**

| # | Gap | Impact | Priorité |
|---|-----|--------|----------|
| G1 | L'onboarding profil ne détecte pas l'intention (Organisateur vs Participant). Un futur Organisateur passe par le même écran qu'un Participant | Onboarding non personnalisé | Moyenne |
| G2 | Le dashboard vide d'un nouveau user est peu guidant : juste un bouton "Créer une Communauté" | Time-to-first-event trop long | Haute |
| G3 | Pas de page marketing/landing pour expliquer la proposition de valeur avant de créer un compte | Conversion cold traffic nulle | Post-MVP |
| G4 | Pas de guide "3 étapes pour lancer votre première communauté" | L'Organisateur débutant est perdu | Haute |

---

## 5. Matrice Persona × Page

> Légende : ✅ implémenté | ⚠️ partiel | ❌ manquant

### `/m/[slug]` — Page publique événement

| Persona | Voit | Peut faire | Manque |
|---------|------|------------|--------|
| Visiteur anonyme | Tout le contenu + inscrits + commentaires | S'inscrire (→ auth), Voir la Communauté | Lien dashboard après auth |
| Participant inscrit | Tout + statut inscrit + CTA "Ajouter au calendrier" ✅ | Commenter, Annuler inscription, Ajouter au calendrier | "Voir dans le dashboard" |
| Participant en liste d'attente | Tout + badge "Liste d'attente" | Annuler l'attente | Position dans la file, ETA estimation |
| Participant non-inscrit (événement futur) | Tout le contenu | S'inscrire | Indication "X places restantes" plus visible |
| Participant non-inscrit (événement PAST) | Tout + banner "Terminé" | Voir commentaires (lecture), Voir la Communauté | — |
| Organisateur | Tout + boutons gestion | Modifier, Supprimer, Copier lien, Commenter | Commenter sur PAST (actuellement bloqué), Stats rapides |

### `/dashboard` — Tableau de bord

| Persona | Voit | Peut faire | Manque |
|---------|------|------------|--------|
| Nouveau user (sans Communauté) | Dashboard vide + CTA Créer Communauté | Créer une Communauté | Guide onboarding Organisateur, explication de la plateforme |
| Participant récurrent | Prochains événements + Communautés | Naviguer vers événements/Communautés | Nouveaux événements dans mes Communautés, événements PAST récents |
| Organisateur actif | Prochains événements + Communautés + CTAs | Créer événement, Créer Communauté, Naviguer | Vue consolidée activité Communauté (inscriptions récentes) |

### `/dashboard/circles/[slug]` — Page Communauté (dashboard)

| Persona | Voit | Peut faire | Manque |
|---------|------|------------|--------|
| Participant | Timeline À venir/Passés + statut inscription | Naviguer vers événement | CTA "S'inscrire aux prochains événements" depuis la timeline |
| Organisateur | Timeline + stats + membres | Modifier Communauté, Supprimer, Créer événement | Communication groupée membres, Export membres, Stats Communauté |

### `/dashboard/circles/[slug]/moments/[slug]` — Page événement (dashboard)

| Persona | Voit | Peut faire | Manque |
|---------|------|------------|--------|
| Participant (événement futur) | Détails + inscrits + commentaires + CTA "Ajouter au calendrier" ✅ | Commenter, Annuler inscription, Ajouter au calendrier | Autres événements de la Communauté |
| Participant (événement PAST) | Détails + commentaires | Voir commentaires (lecture) | — |
| Organisateur (événement futur) | Tout + lien partageable + liste inscrits | Modifier, Supprimer, Copier lien, Commenter, Exporter CSV ✅ | Envoyer rappel, Filtrer inscriptions (REGISTERED/WAITLISTED) |
| Organisateur (événement PAST) | Tout + stats basiques | Voir commentaires | Commenter sur PAST, CTA "Créer le prochain", Stats présence |

---

## 6. Gaps consolidés & Priorisation

### 🔴 Bloquant MVP (sans ça, le produit ne peut pas être lancé)

| # | Gap | Persona(s) impactée(s) | Parcours |
|---|-----|------------------------|----------|
| MVP-1 | ~~**Email de confirmation d'inscription**~~ ✅ **Résolu** | Participant fraîchement inscrit, Visiteur anonyme | A |
| MVP-2 | ~~**Email de rappel 24h/1h avant l'événement**~~ → **Déprioritisé Phase 2** | Participant récurrent | B |
| MVP-3 | ~~**Email de notification de promotion liste d'attente**~~ ✅ **Résolu** | Participant en liste d'attente | C |
| MVP-4 | ~~**Email de notification à l'Organisateur : nouvelle inscription**~~ ✅ **Résolu** | Organisateur actif | D |

### 🟠 Haute priorité (impact fort sur les JTBD clés)

| # | Gap | Persona(s) impactée(s) | Parcours |
|---|-----|------------------------|----------|
| H-1 | **L'Organisateur peut commenter sur un événement PAST** | Organisateur post-événement | F |
| H-2 | **CTA "Créer le prochain événement" depuis un événement PAST** | Organisateur post-événement | F |
| ~~H-3~~ | ~~**Position dans la liste d'attente visible**~~ ✅ **Résolu** | ~~Participant en liste d'attente~~ | ~~C~~ |
| H-4 | **Autres événements de la Communauté visibles sur page événement dashboard** | Participant récurrent | B |
| H-5 | **CTA "Devenir organisateur" pour Participants sans Communauté** | Organisateur débutant | G |
| ~~H-6~~ | ~~**Export CSV des inscrits**~~ ✅ **Résolu** — bouton "Exporter CSV" sur vue Organisateur, client-side avec BOM UTF-8 | ~~Organisateur pré-événement~~ | ~~E~~ |
| H-7 | **Guide onboarding Organisateur** ("3 étapes pour lancer votre communauté") | Organisateur débutant | G |
| H-8 | **Compteur "X inscrits / Y en attente / Z places" sur vue Organisateur** | Organisateur pré-événement | E |

### 🟡 Moyenne priorité (améliore l'expérience sans être bloquant)

| # | Gap | Persona(s) impactée(s) | Parcours |
|---|-----|------------------------|----------|
| ~~M-1~~ | ~~CTA "Ajouter au calendrier" post-inscription (Google, Apple, ICS)~~ ✅ **Résolu** | ~~Participant fraîchement inscrit~~ | ~~A~~ |
| M-2 | Lien vers dashboard visible depuis `/m/[slug]` après auth | Participant fraîchement inscrit | A |
| M-3 | Autres événements de la Communauté en section "Vous aimerez aussi" sur page événement publique (hors PAST) | Visiteur anonyme, Participant non-inscrit | A |
| ~~M-4~~ | ~~Notification aux membres quand un nouvel événement est créé dans leur Communauté~~ ✅ **Résolu** — email `notifyNewMoment` implémenté (voir gap B3 résolu) | ~~Participant récurrent~~ | ~~B~~ |
| M-5 | Liste des inscrits segmentée REGISTERED / WAITLISTED sur vue Organisateur | Organisateur pré-événement | E |
| M-6 | Stats post-événement (taux de présence, engagement) | Organisateur post-événement | F |
| M-7 | Sélecteur de Communauté dans formulaire événement (pour Organisateurs multi-Communautés) | Organisateur actif | D |

### 🔵 Basse priorité / Post-MVP

| # | Gap | Parcours |
|---|-----|----------|
| L-1 | Onboarding différencié Organisateur vs Participant | G |
| L-2 | Communication groupée Organisateur → membres Communauté | E |
| L-3 | Page marketing/landing pour cold traffic | G |
| L-4 | Brouillon d'événement (publication différée) | D |
| L-5 | Stats Communauté enrichies | F |

---

## 7. Actions concrètes par page — Ce qui devrait exister

### Sur `/m/[slug]` après inscription réussie

```
┌─────────────────────────────────────────────┐
│  ✅ Vous êtes inscrit(e) !                   │
│                                             │
│  [📅 Ajouter au calendrier] [→ Mon tableau de bord] │
│                                             │
│  Voir les autres Moments de cette Communauté ↓│
└─────────────────────────────────────────────┘
```

### Sur `/m/[slug]` (événement PAST, vue Organisateur)

```
┌─────────────────────────────────────────────┐
│  Événement terminé · X participants         │
│                                             │
│  [💬 Remercier la communauté]               │  ← débloquer commentaire Organisateur
│  [➕ Créer le prochain événement]           │  ← CTA rétention
└─────────────────────────────────────────────┘
```

### Sur `/dashboard` (Participant sans événement à venir)

```
┌─────────────────────────────────────────────┐
│  Rien à venir dans vos Communautés.         │
│                                             │
│  Nouveaux événements dans vos Communautés : │
│  [Événement récemment ajouté] →            │
└─────────────────────────────────────────────┘
```

### Sur `/dashboard` (nouveau user, dashboard vide)

```
┌─────────────────────────────────────────────┐
│  Bienvenue, [Prénom] !                      │
│                                             │
│  Vous souhaitez :                           │
│  [🎯 Découvrir des événements]              │
│  [🏠 Créer ma communauté] → guide Host     │
└─────────────────────────────────────────────┘
```

---

## 8. Synthèse — Ce qui différencie notre expérience

### Points forts actuels
- **Page événement** : qualité visuelle Luma-level, informations claires, inscription en 2 clics
- **Rétention Communauté** : CTA vers la Communauté sur tous les événements (y compris PAST), timeline communautaire
- **Dashboard Participant-first** : vue personnalisée, statuts inscription visibles
- **Fil de commentaires** : engagement post-événement, communauté vivante

### Talons d'Achille actuels
- ~~**Pas d'emails**~~ ✅ **Résolu** : confirmation inscription, confirmation liste d'attente, promotion, notification Organisateur nouvelle inscription, notification Organisateur nouveau commentaire, notification nouveau follower, notification de mise à jour d'événement, notification d'annulation, notification Organisateur à la création, notification membres/followers à la création d'un événement — 10 emails implémentés. Rappels 24h/1h restent à faire (Phase 2).
- ~~**Pas de notification aux membres à la création d'un événement**~~ ✅ **Résolu** (B3, M-4) — email `notifyNewMoment` envoyé automatiquement à la création.
- **Formulaire de commentaire masqué sur PAST** : y compris pour l'Organisateur, alors que c'est le pic d'engagement
- **L'après-inscription est partiellement guidée** : CTA "Ajouter au calendrier" ✅ résolu, mais lien vers le dashboard encore absent (gap A2)
- **L'onboarding Organisateur n'existe pas** : l'Organisateur débutant est livré à lui-même

### Ce qui nous différencie structurellement de Luma
| The Playground | Luma |
|----------------|------|
| Communauté = entité persistante, membres fidèles | Événement = unité atomique, pas de communauté |
| Page Communauté = couche de rétention | Pas d'équivalent |
| Inscription événement = membre Communauté automatique | Inscription one-shot, pas de lien |
| Timeline communautaire (passé + futur) | Vue calendrier event-centric |
| Emails transactionnels MVP ✅ (rappels restent à faire) | Emails soignés, notifications riches |
