# Page Aide — The Playground
# Contenu proposé

> Fichier de travail — contenu brut à valider avant implémentation.
> Terminologie : Communauté, événement, Organisateur, Participant (termes user-facing FR).

---

## Structure de la page

```
1. Hero (titre + chapeau)
2. Deux chemins : Participant | Organisateur  ← ancres
3. Section Participant
4. Section Organisateur
5. FAQ
6. Contact / Signalement
```

---

## 1. Hero

**Titre :** Comment ça marche ?

**Chapeau :**
The Playground est une plateforme gratuite pour créer et rejoindre des communautés. Organisateurs, gérez vos événements et votre réseau. Participants, découvrez des événements près de chez vous et rejoignez des communautés qui vous ressemblent.

---

## 2. Deux chemins (nav rapide)

```
[ Je suis Participant ]     [ Je suis Organisateur ]
```

---

## 3. Section Participant

### S'inscrire à un événement

La plupart du temps, vous arrivez sur The Playground via un **lien partagé** — par message, sur les réseaux sociaux, ou par email. Ce lien pointe directement vers la page de l'événement.

Sur la page de l'événement :
1. Lisez les informations : date, lieu, description, nombre de participants
2. Cliquez sur **S'inscrire**
3. Si vous n'avez pas encore de compte, vous pouvez vous connecter en quelques secondes (lien magique par email ou via Google / GitHub) — aucun formulaire à remplir
4. Une fois inscrit, vous recevez un **email de confirmation** avec les détails et un lien pour ajouter l'événement à votre calendrier (Google Calendar, Apple Calendar, ou fichier .ics)

> Aucun compte préalable n'est nécessaire pour voir la page d'un événement. L'inscription se fait en moins d'une minute.

---

### Rejoindre une Communauté

Quand vous vous inscrivez à un événement, vous devenez automatiquement membre de sa Communauté. Rien de plus à faire.

En tant que membre, vous pouvez :
- Voir les **prochains événements** de la Communauté
- Consulter les **événements passés**
- Voir les **autres membres**
- Être notifié des nouveaux événements par email (selon vos préférences)

Vous pouvez aussi rejoindre une Communauté sans vous inscrire à un événement, depuis la page **Explorer** ou depuis la page d'une Communauté.

---

### La liste d'attente

Si un événement affiche **complet**, vous pouvez rejoindre la liste d'attente. Si une place se libère (suite à une annulation), vous êtes automatiquement inscrit et recevez un email de confirmation.

---

### Annuler son inscription

Depuis **Mon espace** :
1. Allez sur l'événement concerné
2. Cliquez sur **Annuler mon inscription**

Si vous étiez sur liste d'attente, votre place est simplement supprimée.

---

### Les commentaires

Chaque événement dispose d'un **fil de commentaires**. Vous pouvez poser des questions, partager votre enthousiasme, ou échanger avec d'autres participants. Les commentaires sont visibles par tous les inscrits et par l'Organisateur.

---

### Mon espace

**Mon espace** est votre tableau de bord personnel. Vous y retrouvez :
- Vos **prochains événements** (ceux auxquels vous êtes inscrit)
- Vos **événements passés**
- Les **Communautés** dont vous êtes membre
- Votre **profil** (nom, avatar, préférences de notifications)

---

### Gérer ses notifications

Dans votre profil (**Mon espace → Profil**), vous pouvez activer ou désactiver les emails :
- Confirmation d'inscription
- Rappels avant l'événement
- Modifications ou annulation d'événement
- Nouveaux événements dans vos Communautés

---

### Quitter une Communauté

Depuis la page d'une Communauté dans **Mon espace**, cliquez sur **Quitter la Communauté**. Vos inscriptions aux événements à venir ne sont pas automatiquement annulées — pensez à les annuler séparément si nécessaire.

---

## 4. Section Organisateur

### Créer sa Communauté

La Communauté est votre espace central sur The Playground. C'est depuis là que vous gérez vos événements et votre réseau.

Pour créer votre Communauté :
1. Connectez-vous et accédez à **Mon espace**
2. Cliquez sur **Créer une Communauté**
3. Renseignez : nom, description, thématique, ville, visibilité (publique ou privée)
4. Ajoutez une image de couverture (optionnel mais recommandé)

> Une Communauté publique apparaît dans **Explorer** et est accessible par tous. Une Communauté privée est uniquement accessible via lien direct.

---

### Créer un événement

Depuis votre Communauté, cliquez sur **Créer un événement**.

Les champs essentiels :
- **Titre** — court et clair
- **Date et heure** — début et fin
- **Lieu** — adresse (avec autocomplétion) ou "En ligne" + lien de connexion
- **Description** — contexte, programme, ce que les participants doivent savoir

**Options avancées** (accessibles via "Plus d'options") :
- **Capacité** — nombre maximum de participants (active la liste d'attente automatiquement)
- **Prix** — si l'événement est payant, le paiement se fait via Stripe (les participants paient directement, The Playground ne prend aucune commission)
- **Image de couverture**

> Conseil : un bon titre et une bonne description suffisent pour un événement réussi. Les participants voient cette page en premier — soignez-la.

---

### Gérer les inscriptions

Depuis le tableau de bord de votre événement, vous accédez à :
- La **liste des inscrits** (avec leurs noms, emails, et statut)
- La **liste d'attente**
- La possibilité de **cocher les présents** (check-in) le jour J
- L'**export CSV** de la liste complète

---

### Contacter vos participants

Depuis le tableau de bord de l'événement, le bouton **Envoyer un message** vous permet d'envoyer un email à l'ensemble des inscrits actifs. Utile pour partager des informations de dernière minute, le programme détaillé, ou un lien de connexion.

---

### Modifier ou annuler un événement

Depuis le tableau de bord de l'événement :
- **Modifier** — modifiez les informations à tout moment. Les participants inscrits sont notifiés par email si des informations clés changent.
- **Annuler** — annulez l'événement. Tous les participants reçoivent un email d'annulation.

> Un événement annulé ne peut pas être réactivé. Si vous souhaitez simplement le reporter, modifiez la date plutôt que d'annuler.

---

### Le Radar — trouver l'inspiration

Le **Radar** est un outil IA disponible dans le formulaire de création d'événement. Il analyse les tendances et événements similaires dans votre ville pour vous aider à trouver le bon sujet, le bon créneau, ou la bonne approche.

Vous avez **25 analyses par jour**.

---

### Partager votre événement

Chaque événement dispose d'une **URL unique** (format `the-playground.fr/m/votre-evenement`). Copiez ce lien depuis le tableau de bord de l'événement et partagez-le directement — via WhatsApp, Instagram, email, ou newsletter. Aucune installation ni compte préalable n'est requis pour les participants.

---

### Gérer les membres de votre Communauté

Depuis la page de votre Communauté, vous voyez la liste complète des membres avec leurs emails. Vous pouvez supprimer un membre si nécessaire.

Les membres rejoignent automatiquement votre Communauté lorsqu'ils s'inscrivent à l'un de vos événements.

---

## 5. FAQ

**The Playground est-il gratuit ?**
Oui, entièrement gratuit pour les Organisateurs et les Participants. The Playground ne prend aucune commission. Les seuls frais applicables sont les frais Stripe (~2,9 % + 0,30 €) sur les événements payants, prélevés directement par Stripe.

---

**Quelle est la différence entre une Communauté publique et privée ?**
Une Communauté publique est visible dans **Explorer** et accessible à tous. Une Communauté privée n'est accessible que via un lien direct — elle n'apparaît pas dans l'annuaire.

---

**Puis-je organiser des événements sans créer de Communauté ?**
Non. La Communauté est l'espace central de The Playground. Chaque événement appartient à une Communauté. Créer une Communauté ne prend que quelques minutes.

---

**Que se passe-t-il si un événement est complet ?**
Vous pouvez rejoindre la liste d'attente. Si une place se libère, vous êtes automatiquement inscrit et notifié par email.

---

**Les participants ont-ils besoin d'un compte pour s'inscrire ?**
Ils doivent créer un compte, mais le processus est très rapide : un email suffit (lien magique, sans mot de passe), ou une connexion Google / GitHub. Aucun formulaire long.

---

**Comment récupérer mes données ?**
Depuis **Mon espace → Profil**, les Organisateurs peuvent exporter leurs données. Pour toute demande spécifique (RGPD, suppression de compte), contactez-nous.

---

**Comment signaler un contenu inapproprié ?**
Utilisez le lien **Signaler** présent sur les pages d'événements et de Communautés, ou contactez-nous directement par email.

---

## 6. Contact & Signalement

**Une question non couverte ici ?** Notre équipe vous répond dans les meilleurs délais.

Formulaire de contact : **Nom** / **Email** / **Message** + bouton Envoyer.

---

## Notes d'implémentation (pour plus tard)

- Route suggérée : `/help` ou `/aide` (avec redirect depuis l'autre)
- Page statique (pas de fetch DB) — SSG possible
- Une seule page, longue, avec ancres et navigation sticky par section (Participant / Organisateur / FAQ)
- Pas de recherche dans l'aide pour le MVP — la page est courte enough
- Traduire en EN pour `/en/help`
- Lien "Aide" à ajouter dans le footer (à côté de "À propos", "Changelog")
