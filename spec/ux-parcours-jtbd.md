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

### 1.2 Player fraîchement inscrit — Le Nouveau Membre

**Qui** : Quelqu'un qui vient de créer un compte et de s'inscrire à son premier Moment.

**Comment il arrive** : il venait d'un lien `/m/[slug]`, a fait l'auth (magic link ou OAuth), a peut-être rempli l'onboarding profil, et est maintenant inscrit.

**Ce qu'il sait** : il connaît l'événement. Il ne connaît pas encore la plateforme ni la communauté.

**Ce qu'il cherche** : confirmation que son inscription est bien prise en compte, et une réponse à "Et maintenant ?"

**Sensibilité clé** : l'absence de feedback clair après l'inscription est anxiogène.

---

### 1.3 Player récurrent — Le Membre Actif

**Qui** : Membre d'un ou plusieurs Circles, qui revient régulièrement sur la plateforme.

**Comment il arrive** : email de rappel (non encore implémenté), notification, ou directement par habitude.

**Ce qu'il cherche** :
- Vue rapide de ses prochains Moments
- Ne pas rater les nouveaux Moments de ses Circles
- Consulter les informations pratiques d'un événement imminent (lieu exact, heure, lien visio)
- Gérer ses inscriptions (annuler si nécessaire)

**Sensibilité clé** : il ne veut pas perdre de temps à naviguer pour trouver ce dont il a besoin.

---

### 1.4 Player en liste d'attente — Le Candidat

**Qui** : Player inscrit sur un Moment complet, en attente d'une désistement.

**Comment il arrive** : s'est inscrit sur un Moment complet, ou vient de recevoir une notification.

**Ce qu'il cherche** : savoir s'il a une place, et gérer son inscription.

**Sensibilité clé** : l'incertitude est inconfortable. L'absence de notification de promotion est un abandon certain.

---

### 1.5 Host débutant — L'Organisateur en découverte

**Qui** : Quelqu'un qui veut organiser des événements et évalue si The Playground peut remplacer Meetup ou Luma.

**Comment il arrive** : bouche-à-oreille, article, recommandation d'un autre Host.

**Ce qu'il cherche** :
- Comprendre rapidement ce que la plateforme propose
- Créer son premier Circle et son premier Moment rapidement
- Partager le lien et voir si ça "marche"

**Sensibilité clé** : le time-to-first-event doit être minimal. Si c'est compliqué, il reste sur Luma.

---

### 1.6 Host actif — L'Organisateur communautaire

**Qui** : Organise régulièrement des Moments dans un ou plusieurs Circles. Sa communauté est établie.

**Comment il arrive** : directement sur le dashboard, par habitude.

**Ce qu'il cherche** :
- Créer de nouveaux Moments rapidement
- Voir qui est inscrit, gérer la liste d'attente
- Partager le lien du prochain Moment
- Voir l'engagement de sa communauté (commentaires, inscriptions)

**Sensibilité clé** : il a besoin d'efficacité. Chaque clic inutile dans le dashboard est une friction.

---

### 1.7 Host pré-événement — L'Organisateur en mode préparation

**Qui** : Host dont le Moment est dans les 48h à venir.

**Ce qu'il cherche** :
- Vérifier le nombre de confirmés
- Envoyer des rappels (non implémenté)
- Modifier les infos pratiques si nécessaire (lieu de repli, heure changée)
- Avoir le lien partageable à portée pour les latecomers

**Sensibilité clé** : la pression pré-événement est forte. L'interface doit répondre aux questions sans chercher.

---

### 1.8 Host post-événement — L'Organisateur en mode rétention

**Qui** : Host dont le Moment vient de se terminer (statut PAST).

**Ce qu'il cherche** :
- Lire les commentaires de remerciement
- Annoncer le prochain Moment
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

### Player fraîchement inscrit
4. **Quand** je viens de m'inscrire, **je veux** savoir ce qui m'attend (détails pratiques, autres participants), **pour** me projeter dans l'événement.
5. **Quand** je découvre cette communauté, **je veux** comprendre ce qu'elle propose au-delà de cet événement, **pour** décider si je veux rester impliqué.
6. **Quand** j'ai créé mon compte, **je veux** pouvoir revenir facilement sur la plateforme, **pour** retrouver mes informations sans chercher.

### Player récurrent
7. **Quand** j'ouvre l'app, **je veux** voir mes prochains Moments d'un coup d'œil, **pour** ne pas oublier ce qui m'attend.
8. **Quand** un événement approche, **je veux** retrouver facilement les informations pratiques (adresse, heure, lien visio), **pour** y aller sans stress.
9. **Quand** mes plans changent, **je veux** annuler mon inscription rapidement, **pour** libérer ma place à quelqu'un en attente.
10. **Quand** un nouveau Moment est créé dans un de mes Circles, **je veux** en être informé, **pour** m'inscrire avant que ce soit complet.

### Player en liste d'attente
11. **Quand** je suis sur liste d'attente, **je veux** savoir ma position et la probabilité d'obtenir une place, **pour** décider si je garde espoir ou planifie autre chose.
12. **Quand** une place se libère, **je veux** en être notifié immédiatement, **pour** confirmer avant que quelqu'un d'autre le fasse.

### Host débutant
13. **Quand** je découvre la plateforme, **je veux** créer mon premier événement en moins de 5 minutes, **pour** valider que c'est fait pour moi avant d'investir.
14. **Quand** j'ai publié mon Moment, **je veux** partager le lien facilement, **pour** que mes contacts s'inscrivent.
15. **Quand** mes premiers inscrits arrivent, **je veux** en être notifié, **pour** rester motivé et valider que ça fonctionne.

### Host actif
16. **Quand** je crée un Moment, **je veux** le faire rapidement sans remplir 20 champs, **pour** me concentrer sur la préparation de l'événement lui-même.
17. **Quand** mon Moment est publié, **je veux** accéder au lien partageable en un clic, **pour** le diffuser immédiatement.
18. **Quand** je veux connaître mon audience, **je veux** voir la liste des inscrits avec leurs informations, **pour** me préparer et adapter l'événement.
19. **Quand** un membre annule, **je veux** que la liste d'attente soit gérée automatiquement, **pour** ne pas m'en occuper manuellement.

### Host pré-événement
20. **Quand** mon événement est dans 48h, **je veux** voir le nombre de confirmés en temps réel, **pour** anticiper la logistique.
21. **Quand** les informations changent, **je veux** modifier le Moment rapidement, **pour** que les inscrits aient les bonnes infos.
22. **Quand** je veux rappeler à mes inscrits de venir, **je veux** envoyer un message groupé, **pour** maximiser le taux de présence.

### Host post-événement
23. **Quand** mon Moment est terminé, **je veux** remercier et interagir avec les participants, **pour** renforcer le lien communautaire.
24. **Quand** ma communauté est encore engagée, **je veux** annoncer le prochain Moment, **pour** capitaliser sur l'élan.
25. **Quand** j'analyse mon événement, **je veux** connaître le taux de présence et l'engagement, **pour** améliorer les prochains.

---

## 3. Points d'entrée

| Point d'entrée | Persona(s) | Déclencheur |
|----------------|------------|-------------|
| `/m/[slug]` | Visiteur anonyme, Player non-inscrit | Lien partagé (WhatsApp, email, réseaux) |
| `/m/[slug]` (connecté) | Player inscrit, Player waitlisté | Email de confirmation / rappel |
| `/dashboard` | Player récurrent, Host actif | Habitude, favoris, email |
| `/dashboard/circles/[slug]` | Host actif, Player récurrent | Navigation dashboard |
| `/dashboard/circles/[slug]/moments/[slug]` | Host pré/post-événement | Gestion d'un Moment spécifique |
| Email de confirmation | Player fraîchement inscrit | Post-inscription |
| Email de rappel | Player récurrent, Player waitlisté | 24h/1h avant |
| Email promotion liste d'attente | Player waitlisté | Désistement d'un inscrit |
| Page marketing (non construite) | Host débutant | Bouche-à-oreille, SEO |

---

## 4. Parcours détaillés

### Parcours A — Découverte virale : du lien au premier engagement

**Persona** : Visiteur anonyme → Player fraîchement inscrit
**Déclencheur** : réception d'un lien Moment sur mobile
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
- Page Moment publique : titre, date, lieu, description, inscrits, commentaires ✓
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
| A4 | La page `/m/[slug]` ne propose pas d'autres Moments du Circle (hors PAST) | Rétention Circle manquée pour les événements actifs | Moyenne |
| A5 | L'onboarding ne distingue pas Host et Player | Un futur Host n'est pas guidé vers la création de Circle | Basse (post-MVP) |

---

### Parcours B — Retour régulier Player

**Persona** : Player récurrent
**Déclencheur** : habitude, email de rappel, notification
**Fréquence** : usage régulier post-inscription

```
[Accès direct /dashboard] → [Vue "Mes prochains Moments"]
                                       ↓
                          [Clic sur un Moment]
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
- Dashboard avec timeline "Mes prochains Moments" ✓
- Lien vers le Moment dashboard ✓ (fix bug précédent)
- Détails du Moment (lieu, heure, description) ✓
- Fil de commentaires ✓
- Bouton d'annulation ✓

**Gaps :**

| # | Gap | Impact | Priorité |
|---|-----|--------|----------|
| B1 | Pas d'email de rappel 24h/1h avant l'événement | Taux d'absence élevé (oubli) | ~~Bloquante~~ → **Déprioritisée Phase 2** (nécessite jobs planifiés Vercel Cron / QStash) |
| B2 | Depuis la page Moment dashboard, aucune vue des autres Moments du même Circle | Découverte limitée, rétention faible | Haute |
| B3 | Pas de notification quand un nouveau Moment est créé dans un Circle dont on est membre | Le Player revient seulement s'il pense à venir | Haute |
| B4 | Pas d'infos pratiques en format "résumé rapide" au-dessus de la ligne de flottaison sur mobile | Sur mobile, doit scroller pour trouver l'adresse | Moyenne |

---

### Parcours C — Gestion liste d'attente

**Persona** : Player en liste d'attente
**Déclencheur** : s'est inscrit sur un Moment complet

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
- Badge "Liste d'attente" sur dashboard et timeline Circle ✓
- Promotion automatique sur désistement ✓
- Email de notification de promotion ✓

**Gaps :**

| # | Gap | Impact | Priorité |
|---|-----|--------|----------|
| C1 | ~~Pas d'email de notification de promotion~~ ✅ **Résolu** — email de promotion liste d'attente implémenté | ~~Le Player ne sait pas qu'il a une place~~ | ~~Bloquante~~ ✅ |
| C2 | ~~Position dans la liste d'attente non visible~~ ✅ **Résolu** — calcul à la volée via `countWaitlistPosition`, affiché dans `RegistrationButton` sur `/m/[slug]` et dashboard | ~~Incertitude maximale~~ | ~~Haute~~ ✅ |
| C3 | Pas d'option "m'alerter si une place se libère" explicite | Le mécanisme est implicite, pas rassurant | Haute |

---

### Parcours D — Host : créer et lancer un Moment

**Persona** : Host actif
**Déclencheur** : veut organiser un événement
**Fréquence** : récurrent, critique pour la rétention Host

```
[/dashboard] → [Bouton "Créer un Moment"]
                        ↓
              [Formulaire : titre, date, lieu, description]
              [Options avancées masquées : capacité, prix]
                        ↓
              [Publication → slug généré → /m/[slug] créée]
                        ↓
              [Page Moment dashboard → lien partageable visible]
                        ↓
              [Copie + partage WhatsApp/email/réseaux]
                        ↓
              [Premiers inscrits → notification email Host ✅]
```

**État actuel (implémenté) :**
- Bouton "Créer un Moment" sur dashboard (si Host) ✓
- Formulaire minimaliste avec options avancées ✓
- Génération de slug ✓
- Lien partageable avec bouton Copier sur la page Moment dashboard ✓
- Auto-inscription du Host au Moment ✓
- Email de notification au Host quand un Player s'inscrit ✓

**Gaps :**

| # | Gap | Impact | Priorité |
|---|-----|--------|----------|
| D1 | ~~Pas d'email de notification quand quelqu'un s'inscrit~~ ✅ **Résolu** — notification Host implémentée | ~~Le Host ne sait pas que ça "marche"~~ | ~~Haute~~ ✅ |
| D2 | Le bouton "Créer un Moment" n'est visible que si l'utilisateur est déjà Host. Un Player qui veut organiser n'a pas de CTA évident pour devenir Host | Adoption Host bloquée | Haute |
| D3 | Après création d'un Moment, pas de step "Partagez maintenant" avec le lien en grand | Le partage n'est pas assez encouragé | Moyenne |
| D4 | Le Moment est automatiquement lié au Circle du Host, mais si le Host a plusieurs Circles, la sélection du Circle dans le formulaire n'est pas évidente | Confusion multi-Circle | Moyenne |
| D5 | Pas de moyen de programmer un Moment (brouillon) avant de le publier | Le Host doit tout remplir en une fois | Basse |

---

### Parcours E — Host : gérer un Moment (pré-événement)

**Persona** : Host pré-événement
**Déclencheur** : Moment dans les 48h

```
[/dashboard/circles/[slug]/moments/[slug]] → [Vue gestion Moment]
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
| E3 | Pas d'export CSV des inscrits | Besoin logistique (badges, listes d'émargement) | Haute |
| E4 | Pas de compteur "X inscrits confirmés / Y en attente / Z places restantes" affiché en un coup d'œil | Doit calculer mentalement | Moyenne |

---

### Parcours F — Host : post-événement et rétention

**Persona** : Host post-événement
**Déclencheur** : transition automatique PUBLISHED → PAST

```
[Moment → statut PAST] → [Page Moment en vue PAST]
                                    ↓
                [Lire les commentaires des participants]
                                    ↓
              ┌────────────────────────────────────────────┐
              │ Répondre / remercier (formulaire masqué !)  │ ← GAP
              │ Créer le prochain Moment                    │
              │ Voir les stats de présence                  │ ← GAP
              └────────────────────────────────────────────┘
```

**État actuel (implémenté) :**
- Indicateurs visuels PAST (cover grisée, badge, banner) ✓
- Commentaires visibles en lecture ✓
- Carte "Événement terminé" avec CTA vers le Circle ✓

**Gaps :**

| # | Gap | Impact | Priorité |
|---|-----|--------|----------|
| F1 | Formulaire de commentaire masqué sur les Moments PAST **même pour le Host** | Le Host ne peut pas remercier sa communauté | Haute |
| F2 | Pas de stats post-événement (taux d'inscription vs présence) | Le Host ne peut pas mesurer l'efficacité | Moyenne |
| F3 | Pas de CTA "Créer le prochain Moment" depuis la page PAST | Le moment de rebond est manqué | Haute |
| F4 | Pas de notification aux membres du Circle pour annoncer que le compte-rendu / les commentaires sont disponibles | Engagement post-événement faible | Moyenne |

---

### Parcours G — Onboarding nouveau Host

**Persona** : Host débutant, première visite
**Déclencheur** : recommandation, bouche-à-oreille

```
[Découverte plateforme] → [Création compte]
                                  ↓
                        [Onboarding profil]
                                  ↓
                        [Dashboard vide] → ???  ← GAP CRITIQUE
                                  ↓
                        [Trouver CTA "Créer un Circle"]
                                  ↓
                        [Créer le Circle]
                                  ↓
                        [Trouver CTA "Créer un Moment"]
                                  ↓
                        [Premier Moment publié]
                                  ↓
                        [Partager le lien]
```

**État actuel (implémenté) :**
- Onboarding profil obligatoire ✓
- Dashboard avec CTA "Créer une Communauté" si aucun Circle ✓
- Formulaire création Circle + Moment ✓

**Gaps :**

| # | Gap | Impact | Priorité |
|---|-----|--------|----------|
| G1 | L'onboarding profil ne détecte pas l'intention (Host vs Player). Un futur Host passe par le même écran qu'un Player | Onboarding non personnalisé | Moyenne |
| G2 | Le dashboard vide d'un nouveau user est peu guidant : juste un bouton "Créer une Communauté" | Time-to-first-event trop long | Haute |
| G3 | Pas de page marketing/landing pour expliquer la proposition de valeur avant de créer un compte | Conversion cold traffic nulle | Post-MVP |
| G4 | Pas de guide "3 étapes pour lancer votre première communauté" | Le Host débutant est perdu | Haute |

---

## 5. Matrice Persona × Page

> Légende : ✅ implémenté | ⚠️ partiel | ❌ manquant

### `/m/[slug]` — Page publique Moment

| Persona | Voit | Peut faire | Manque |
|---------|------|------------|--------|
| Visiteur anonyme | Tout le contenu + inscrits + commentaires | S'inscrire (→ auth), Voir le Circle | Lien dashboard après auth |
| Player inscrit | Tout + statut inscrit + CTA "Ajouter au calendrier" ✅ | Commenter, Annuler inscription, Ajouter au calendrier | "Voir dans le dashboard" |
| Player waitlisté | Tout + badge "Liste d'attente" | Annuler l'attente | Position dans la file, ETA estimation |
| Player non-inscrit (Moment futur) | Tout le contenu | S'inscrire | Indication "X places restantes" plus visible |
| Player non-inscrit (Moment PAST) | Tout + banner "Terminé" | Voir commentaires (lecture), Voir le Circle | — |
| Host | Tout + boutons gestion | Modifier, Supprimer, Copier lien, Commenter | Commenter sur PAST (actuellement bloqué), Stats rapides |

### `/dashboard` — Tableau de bord

| Persona | Voit | Peut faire | Manque |
|---------|------|------------|--------|
| Nouveau user (sans Circle) | Dashboard vide + CTA Créer Circle | Créer un Circle | Guide onboarding Host, explication de la plateforme |
| Player récurrent | Prochains Moments + Circles | Naviguer vers Moments/Circles | Nouveaux Moments dans mes Circles, Moments PAST récents |
| Host actif | Prochains Moments + Circles + CTAs | Créer Moment, Créer Circle, Naviguer | Vue consolidée activité Circle (inscriptions récentes) |

### `/dashboard/circles/[slug]` — Page Circle (dashboard)

| Persona | Voit | Peut faire | Manque |
|---------|------|------------|--------|
| Player | Timeline À venir/Passés + statut inscription | Naviguer vers Moment | CTA "S'inscrire aux prochains Moments" depuis la timeline |
| Host | Timeline + stats + membres | Modifier Circle, Supprimer, Créer Moment | Communication groupée membres, Export membres, Stats Circle |

### `/dashboard/circles/[slug]/moments/[slug]` — Page Moment (dashboard)

| Persona | Voit | Peut faire | Manque |
|---------|------|------------|--------|
| Player (Moment futur) | Détails + inscrits + commentaires + CTA "Ajouter au calendrier" ✅ | Commenter, Annuler inscription, Ajouter au calendrier | Autres Moments du Circle |
| Player (Moment PAST) | Détails + commentaires | Voir commentaires (lecture) | — |
| Host (Moment futur) | Tout + lien partageable + liste inscrits | Modifier, Supprimer, Copier lien, Commenter | Envoyer rappel, Export CSV, Filtrer inscriptions |
| Host (Moment PAST) | Tout + stats basiques | Voir commentaires | Commenter sur PAST, CTA "Créer le prochain", Stats présence |

---

## 6. Gaps consolidés & Priorisation

### 🔴 Bloquant MVP (sans ça, le produit ne peut pas être lancé)

| # | Gap | Persona(s) impactée(s) | Parcours |
|---|-----|------------------------|----------|
| MVP-1 | ~~**Email de confirmation d'inscription**~~ ✅ **Résolu** | Player fraîchement inscrit, Visiteur anonyme | A |
| MVP-2 | ~~**Email de rappel 24h/1h avant l'événement**~~ → **Déprioritisé Phase 2** | Player récurrent | B |
| MVP-3 | ~~**Email de notification de promotion liste d'attente**~~ ✅ **Résolu** | Player waitlisté | C |
| MVP-4 | ~~**Email de notification au Host : nouvelle inscription**~~ ✅ **Résolu** | Host actif | D |

### 🟠 Haute priorité (impact fort sur les JTBD clés)

| # | Gap | Persona(s) impactée(s) | Parcours |
|---|-----|------------------------|----------|
| H-1 | **Host peut commenter sur Moment PAST** | Host post-événement | F |
| H-2 | **CTA "Créer le prochain Moment" depuis Moment PAST** | Host post-événement | F |
| ~~H-3~~ | ~~**Position dans la liste d'attente visible**~~ ✅ **Résolu** | ~~Player waitlisté~~ | ~~C~~ |
| H-4 | **Autres Moments du Circle visible sur page Moment dashboard** | Player récurrent | B |
| H-5 | **CTA "Devenir organisateur" pour Players sans Circle** | Host débutant | G |
| H-6 | **Export CSV des inscrits** | Host pré-événement | E |
| H-7 | **Guide onboarding Host** ("3 étapes pour lancer votre communauté") | Host débutant | G |
| H-8 | **Compteur "X inscrits / Y en attente / Z places" sur vue Host** | Host pré-événement | E |

### 🟡 Moyenne priorité (améliore l'expérience sans être bloquant)

| # | Gap | Persona(s) impactée(s) | Parcours |
|---|-----|------------------------|----------|
| ~~M-1~~ | ~~CTA "Ajouter au calendrier" post-inscription (Google, Apple, ICS)~~ ✅ **Résolu** | ~~Player fraîchement inscrit~~ | ~~A~~ |
| M-2 | Lien vers dashboard visible depuis `/m/[slug]` après auth | Player fraîchement inscrit | A |
| M-3 | Autres Moments du Circle en section "Vous aimerez aussi" sur page Moment publique (hors PAST) | Visiteur anonyme, Player non-inscrit | A |
| M-4 | Notification aux membres quand un nouveau Moment est créé dans leur Circle | Player récurrent | B |
| M-5 | Liste des inscrits segmentée REGISTERED / WAITLISTED sur vue Host | Host pré-événement | E |
| M-6 | Stats post-événement (taux de présence, engagement) | Host post-événement | F |
| M-7 | Sélecteur de Circle dans formulaire Moment (pour Hosts multi-Circles) | Host actif | D |

### 🔵 Basse priorité / Post-MVP

| # | Gap | Parcours |
|---|-----|----------|
| L-1 | Onboarding différencié Host vs Player | G |
| L-2 | Communication groupée Host → membres Circle | E |
| L-3 | Page marketing/landing pour cold traffic | G |
| L-4 | Brouillon de Moment (publication différée) | D |
| L-5 | Stats Circle enrichies | F |

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

### Sur `/m/[slug]` (Moment PAST, vue Host)

```
┌─────────────────────────────────────────────┐
│  Événement terminé · X participants         │
│                                             │
│  [💬 Remercier la communauté]               │  ← débloquer commentaire Host
│  [➕ Créer le prochain Moment]              │  ← CTA rétention
└─────────────────────────────────────────────┘
```

### Sur `/dashboard` (Player sans Moment à venir)

```
┌─────────────────────────────────────────────┐
│  Rien à venir dans vos Circles.             │
│                                             │
│  Nouveaux Moments dans vos Circles :        │
│  [Moment récemment ajouté] →               │
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
- **Page Moment** : qualité visuelle Luma-level, informations claires, inscription en 2 clics
- **Rétention Circle** : CTA vers le Circle sur tous les Moments (y compris PAST), timeline communautaire
- **Dashboard Player-first** : vue personnalisée, statuts inscription visibles
- **Fil de commentaires** : engagement post-Moment, communauté vivante

### Talons d'Achille actuels
- ~~**Pas d'emails**~~ ✅ **Résolu** : confirmation inscription, confirmation liste d'attente, promotion, notification Host nouvelle inscription, notification Host nouveau commentaire — 5 emails MVP implémentés. Rappels 24h/1h restent à faire (Phase 2).
- **Formulaire de commentaire masqué sur PAST** : y compris pour le Host, alors que c'est le pic d'engagement
- **L'après-inscription est partiellement guidée** : CTA "Ajouter au calendrier" ✅ résolu, mais lien vers le dashboard encore absent (gap A2)
- **L'onboarding Host n'existe pas** : le Host débutant est livré à lui-même

### Ce qui nous différencie structurellement de Luma
| The Playground | Luma |
|----------------|------|
| Circle = entité persistante, membres fidèles | Event = unité atomique, pas de communauté |
| Page Circle = couche de rétention | Pas d'équivalent |
| Inscription Moment = membre Circle automatique | Inscription one-shot, pas de lien |
| Timeline communautaire (passé + futur) | Vue calendrier event-centric |
| Emails transactionnels MVP ✅ (rappels restent à faire) | Emails soignés, notifications riches |
