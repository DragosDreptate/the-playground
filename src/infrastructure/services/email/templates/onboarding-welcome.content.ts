/**
 * Contenu textuel de l'email d'onboarding — Lettre du fondateur.
 *
 * Modifier ce fichier pour changer le texte de l'email sans toucher
 * au template React Email (layout/styling).
 *
 * Spec de référence : `spec/mkt/emails/onboarding-1-lettre-fondateur.md`
 */

export const onboardingWelcomeContent = {
  /** Texte de preview (visible dans la liste des emails, pas dans le body). */
  preview: "Une histoire de conviction — et ce que je te demande.",

  /** Sujet de l'email. */
  subject: "The Playground a besoin de toi",

  /** Expéditeur affiché. */
  senderName: "Dragos \u00B7 The Playground",

  /** Adresse de réponse. */
  replyTo: "dragos@the-playground.fr",

  /** Salutation — `{firstName}` sera remplacé par le prénom ou le fallback. */
  greeting: "Bonjour {firstName},",
  greetingFallback: "Bonjour \u00E0 toi,",

  /** Corps principal — chaque entrée = un paragraphe. */
  intro: [
    "Il y a quelque chose que j'aimerais partager avec toi.",
    "J'ai construit The Playground parce que j'en avais marre de voir des organisateurs se faire plumer. Meetup qui facture des abonnements pour acc\u00E9der \u00E0 sa propre communaut\u00E9. Luma, \u00E9l\u00E9gant mais sans m\u00E9moire — chaque \u00E9v\u00E9nement repart de z\u00E9ro, aucun lien qui dure.",
    "Les gens qui animent des communaut\u00E9s font quelque chose d'utile. Ils m\u00E9ritent un outil \u00E0 la hauteur — gratuit, fran\u00E7ais, au code ouvert, o\u00F9 les communaut\u00E9s qu'ils animent restent les leurs.",
    "C'est \u00E7a, The Playground. Rien de plus, rien de moins.",
  ],

  /** Section "O\u00F9 on en est". */
  statusLabel: "O\u00F9 on en est",
  statusParagraphs: [
    "L'app tourne. La structure est solide, les fonctionnalit\u00E9s sont l\u00E0. Mais une plateforme pour les communaut\u00E9s sans communaut\u00E9s, \u00E7a ne prouve rien \u00E0 personne — ni aux organisateurs qui h\u00E9sitent, ni \u00E0 moi.",
    "Ce qu'il manque, ce sont les premi\u00E8res vraies communaut\u00E9s qui vivent, qui grandissent, dont les membres reviennent.",
    "Tu as cr\u00E9\u00E9 un compte. \u00C7a veut dire que quelque chose a r\u00E9sonn\u00E9. Et \u00E7a compte.",
  ],

  /** Section "Ce que j'aimerais te demander". */
  askLabel: "Ce que j'aimerais te demander",
  askParagraphs: [
    "Pas un like. Pas un partage (m\u00EAme si je ne le refuserais pas).",
    "Juste \u00E7a : si tu penses \u00E0 quelqu'un qui organise des \u00E9v\u00E9nements r\u00E9guli\u00E8rement — un meetup, un atelier, un r\u00E9seau pro, des moments informels, peu importe — parle-lui de The Playground.",
  ],

  /** Texte mis en avant (highlight box). */
  highlight: "Une personne. Une conversation.",

  /** Phrase de conclusion apr\u00E8s le highlight. */
  conclusion: "C'est comme \u00E7a que les outils qui durent se construisent.",

  /** Section de cl\u00F4ture (fond gris). */
  closingParagraphs: [
    "Si tu as envie de r\u00E9pondre, fais-le. Je lis tout et je r\u00E9ponds personnellement.",
    "Merci d'\u00EAtre l\u00E0.",
  ],
  signature: "— Dragos",
  signatureSubline: "Fondateur de The Playground",

  /** Footer. */
  footer: "Tu re\u00E7ois cet email car tu as cr\u00E9\u00E9 un compte sur The Playground.",
} as const;
