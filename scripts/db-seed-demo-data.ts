/**
 * Injecte des données de démo réalistes dans la base de données.
 * Utilisable en dev (via .env.local) et en prod (via DATABASE_URL injecté par le script shell).
 *
 * Idempotent : safe à relancer, ne duplique pas les données.
 * Tous les utilisateurs utilisent le domaine @demo.playground (convention pérenne).
 *
 * Contenu :
 *   - 6 Circles publics, thématiques variées (Tech, Design, Sport, Business, Art, Sciences)
 *   - 20 utilisateurs (6 hosts + 14 players)
 *   - 5 Moments par Circle (1 passé + 4 à venir → ratio 20 % / 80 %)
 *   - Membres répartis entre Circles (5–20 membres par Circle)
 *   - Quelques Moments en ligne
 *   - Contenu en français (noms, villes, descriptions réalistes)
 *
 * Usage dev  : pnpm db:seed-demo-data
 * Usage prod : pnpm db:seed-demo-data:prod  (passe par db-seed-demo-data-prod.sh)
 */

import { config } from "dotenv";
config({ path: ".env.local" }); // Sans effet si DATABASE_URL est déjà défini dans l'environnement

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL non défini.");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
});

// ── Utilisateurs démo ─────────────────────────────────────────────────────────

const USERS = [
  // Hosts
  { key: "sophie",   email: "sophie@demo.playground",   firstName: "Sophie",  lastName: "Leclerc" },
  { key: "julien",   email: "julien@demo.playground",   firstName: "Julien",  lastName: "Morin" },
  { key: "pierre",   email: "pierre@demo.playground",   firstName: "Pierre",  lastName: "Garnier" },
  { key: "emma",     email: "emma@demo.playground",     firstName: "Emma",    lastName: "Fontaine" },
  { key: "lea",      email: "lea@demo.playground",      firstName: "Léa",     lastName: "Chevalier" },
  { key: "baptiste", email: "baptiste@demo.playground", firstName: "Baptiste",lastName: "Roux" },
  // Players
  { key: "chloe",    email: "chloe@demo.playground",    firstName: "Chloé",   lastName: "Dufour" },
  { key: "antoine",  email: "antoine@demo.playground",  firstName: "Antoine", lastName: "Leblanc" },
  { key: "marie",    email: "marie@demo.playground",    firstName: "Marie",   lastName: "Simon" },
  { key: "hugo",     email: "hugo@demo.playground",     firstName: "Hugo",    lastName: "Bertrand" },
  { key: "clara",    email: "clara@demo.playground",    firstName: "Clara",   lastName: "Dumont" },
  { key: "theo",     email: "theo@demo.playground",     firstName: "Théo",    lastName: "Lambert" },
  { key: "ines",     email: "ines@demo.playground",     firstName: "Inès",    lastName: "Marchand" },
  { key: "raphael",  email: "raphael@demo.playground",  firstName: "Raphaël", lastName: "Girard" },
  { key: "jade",     email: "jade@demo.playground",     firstName: "Jade",    lastName: "Martin" },
  { key: "axel",     email: "axel@demo.playground",     firstName: "Axel",    lastName: "Dupont" },
  { key: "lucie",    email: "lucie@demo.playground",    firstName: "Lucie",   lastName: "Petit" },
  { key: "nathan",   email: "nathan@demo.playground",   firstName: "Nathan",  lastName: "Bernard" },
  { key: "oceane",   email: "oceane@demo.playground",   firstName: "Océane",  lastName: "Lefebvre" },
  { key: "louis",    email: "louis@demo.playground",    firstName: "Louis",   lastName: "Moreau" },
  // Utilisateur "blank slate" — aucune communauté, aucune inscription
  // dashboardMode: null → redirigé vers la welcome page (test du flux onboarding mode)
  { key: "thomas",   email: "thomas@demo.playground",   firstName: "Thomas",  lastName: "Renard" },
];

// ── Données démo ──────────────────────────────────────────────────────────────

const DEMO_DATA = [
  {
    // ── Circle 1 : Tech & IA — Paris ─────────────────────────────────────────
    slug: "demo-paris-js",
    name: "Paris JS",
    description:
      "La communauté JavaScript et TypeScript de Paris. Meetups mensuels, workshops pratiques " +
      "et hackathons dans la meilleure ambiance. Tous niveaux bienvenus — du débutant curieux " +
      "au senior qui veut partager. On parle JS, React, Node, Bun, tout l'écosystème.",
    visibility: "PUBLIC" as const,
    category: "TECH" as const,
    city: "Paris",
    hostKey: "sophie",
    moments: [
      {
        // ── Passé ──────────────────────────────────────────────────────────
        slug: "demo-paris-js-soiree-pizza-janv",
        title: "Soirée JS & Pizza",
        description:
          "Une soirée décontractée autour de JavaScript ! Au programme : deux lightning talks " +
          "(React Server Components et l'émergence de Bun), pizza party et networking. " +
          "Venez nombreux, l'entrée est libre et la bonne humeur garantie.",
        startsAt: new Date("2026-01-16T19:00:00"),
        endsAt: new Date("2026-01-16T22:00:00"),
        locationType: "IN_PERSON" as const,
        locationName: "Le Wagon Paris",
        locationAddress: "16 Villa Gaudelet, 75011 Paris",
        videoLink: null,
        capacity: 50,
        status: "PAST" as const,
        registrations: ["sophie", "chloe", "antoine", "marie", "hugo", "clara", "theo", "ines", "raphael"],
        comments: [
          { user: "chloe",   content: "Super soirée ! La prez sur les Server Components était vraiment claire. Merci Sophie !" },
          { user: "antoine", content: "J'ai adoré l'ambiance, et la pizza était bonne 🍕 À bientôt pour la prochaine !" },
          { user: "marie",   content: "Mon premier meetup JS et j'en sors avec plein d'idées. Top communauté." },
          { user: "sophie",  content: "Merci à tous d'être venus ! On se retrouve en mars pour un deep dive React 🚀" },
          { user: "theo",    content: "La compa Bun vs Node m'a convaincu de tester Bun sur mon prochain projet." },
        ],
      },
      {
        // ── À venir 1 ──────────────────────────────────────────────────────
        slug: "demo-paris-js-react-deep-dive-mars",
        title: "React 19 — Deep Dive Server Actions",
        description:
          "On plonge dans les Server Actions de React 19 : comment ça marche vraiment, " +
          "les pièges à éviter, et les patterns qui émergent en production. " +
          "Session pratique avec des exemples concrets. Pensez à amener votre ordi.",
        startsAt: new Date("2026-03-19T18:30:00"),
        endsAt: new Date("2026-03-19T21:00:00"),
        locationType: "IN_PERSON" as const,
        locationName: "NUMA Paris",
        locationAddress: "39 Rue du Caire, 75002 Paris",
        videoLink: null,
        capacity: 35,
        status: "PUBLISHED" as const,
        registrations: ["sophie", "jade", "axel", "lucie", "nathan", "oceane", "louis", "chloe", "marie"],
        comments: [],
      },
      {
        // ── À venir 2 ──────────────────────────────────────────────────────
        slug: "demo-paris-js-typescript-avance-avr",
        title: "TypeScript avancé — Types utilitaires et inférence",
        description:
          "Session en ligne pour aller plus loin avec TypeScript : types conditionnels, " +
          "mapped types, template literal types et inférence avancée. " +
          "Exemples tirés de vraies codebases. Niveau intermédiaire recommandé.",
        startsAt: new Date("2026-04-09T19:00:00"),
        endsAt: new Date("2026-04-09T20:30:00"),
        locationType: "ONLINE" as const,
        locationName: null,
        locationAddress: null,
        videoLink: "https://meet.google.com/abc-defg-hij",
        capacity: 100,
        status: "PUBLISHED" as const,
        registrations: ["sophie", "antoine", "hugo", "theo", "raphael", "jade", "axel"],
        comments: [],
      },
      {
        // ── À venir 3 ──────────────────────────────────────────────────────
        slug: "demo-paris-js-performance-web-mai",
        title: "Performance web en 2026 — Core Web Vitals et au-delà",
        description:
          "Comment mesurer, analyser et améliorer les performances de vos apps web ? " +
          "Lighthouse, Web Vitals, profiling réseau, optimisation des bundles. " +
          "Retours terrain d'équipes qui ont amélioré leur LCP de 40 %.",
        startsAt: new Date("2026-05-14T18:30:00"),
        endsAt: new Date("2026-05-14T21:00:00"),
        locationType: "IN_PERSON" as const,
        locationName: "Station F",
        locationAddress: "5 Parvis Alan Turing, 75013 Paris",
        videoLink: null,
        capacity: 60,
        status: "PUBLISHED" as const,
        registrations: ["sophie", "lucie", "nathan", "oceane", "louis", "clara", "ines"],
        comments: [],
      },
      {
        // ── À venir 4 ──────────────────────────────────────────────────────
        slug: "demo-paris-js-hackathon-ete-2026",
        title: "Hackathon Été 2026 — Build Something Cool",
        description:
          "48h pour construire un projet JavaScript/TypeScript en équipe. " +
          "Thème dévoilé le vendredi soir. Équipes de 2 à 4 personnes. " +
          "Repas inclus, hébergement non fourni. Places très limitées — inscrivez-vous vite !",
        startsAt: new Date("2026-06-12T18:00:00"),
        endsAt: new Date("2026-06-14T18:00:00"),
        locationType: "IN_PERSON" as const,
        locationName: "Hôtel de Ville de Paris",
        locationAddress: "Place de l'Hôtel de Ville, 75004 Paris",
        videoLink: null,
        capacity: 40,
        status: "PUBLISHED" as const,
        registrations: ["sophie", "chloe", "antoine", "marie"],
        comments: [],
      },
    ],
  },
  {
    // ── Circle 2 : Product & Design — Lyon ───────────────────────────────────
    slug: "demo-design-produit-lyon",
    name: "Design & Produit Lyon",
    description:
      "La communauté des designers et Product Managers de la région lyonnaise. " +
      "On parle UX research, design systems, Figma, stratégie produit et priorisation. " +
      "Meetups bimensuels, ateliers pratiques et belles discussions autour d'un verre.",
    visibility: "PUBLIC" as const,
    category: "DESIGN" as const,
    city: "Lyon",
    hostKey: "julien",
    moments: [
      {
        // ── Passé ──────────────────────────────────────────────────────────
        slug: "demo-design-ux-research-interviews-janv",
        title: "UX Research — Mener des interviews utilisateurs",
        description:
          "Atelier pratique sur les interviews utilisateurs : comment recruter, " +
          "préparer son guide d'entretien, analyser les verbatims et synthétiser les insights. " +
          "Exercices en duo avec retour de groupe. Niveau débutant OK.",
        startsAt: new Date("2026-01-22T18:30:00"),
        endsAt: new Date("2026-01-22T21:00:00"),
        locationType: "IN_PERSON" as const,
        locationName: "Cowork'in Lyon",
        locationAddress: "25 Rue de la Barre, 69002 Lyon",
        videoLink: null,
        capacity: 20,
        status: "PAST" as const,
        registrations: ["julien", "chloe", "marie", "clara"],
        comments: [
          { user: "chloe",  content: "Super atelier ! J'avais jamais fait d'interview utilisateur et maintenant je me sens capable. Merci Julien." },
          { user: "marie",  content: "La méthode du guide semi-directif, je vais l'appliquer dès lundi. Très inspirant." },
          { user: "julien", content: "Ravie que ça vous ait plu ! Prochain atelier en mars sur les Design Systems 🎨" },
        ],
      },
      {
        // ── À venir 1 ──────────────────────────────────────────────────────
        slug: "demo-design-systems-atomic-mars",
        title: "Design Systems — Atomic Design en pratique",
        description:
          "Comment structurer un design system solide avec la méthodologie Atomic Design ? " +
          "De l'atome au template, on explore les patterns Figma et leur traduction en composants React. " +
          "Retour d'expérience sur un design system en production chez une startup lyonnaise.",
        startsAt: new Date("2026-03-12T18:30:00"),
        endsAt: new Date("2026-03-12T21:00:00"),
        locationType: "IN_PERSON" as const,
        locationName: "Cowork'in Lyon",
        locationAddress: "25 Rue de la Barre, 69002 Lyon",
        videoLink: null,
        capacity: 25,
        status: "PUBLISHED" as const,
        registrations: ["julien", "ines", "jade", "lucie", "oceane", "chloe"],
        comments: [],
      },
      {
        // ── À venir 2 ──────────────────────────────────────────────────────
        slug: "demo-design-figma-variables-avr",
        title: "Figma avancé — Variables, modes et Auto Layout",
        description:
          "Session en ligne dédiée aux features avancées de Figma : variables (couleurs, typo, espacement), " +
          "modes clairs/sombres, composants paramétrables et Auto Layout v4. " +
          "Live coding avec partage d'écran — apportez vos questions !",
        startsAt: new Date("2026-04-16T18:00:00"),
        endsAt: new Date("2026-04-16T20:00:00"),
        locationType: "ONLINE" as const,
        locationName: null,
        locationAddress: null,
        videoLink: "https://meet.google.com/xyz-uvwx-yz",
        capacity: 80,
        status: "PUBLISHED" as const,
        registrations: ["julien", "marie", "clara", "ines", "jade"],
        comments: [],
      },
      {
        // ── À venir 3 ──────────────────────────────────────────────────────
        slug: "demo-design-product-roadmap-mai",
        title: "Product Roadmap — Comment prioriser sans se perdre",
        description:
          "La roadmap produit, c'est l'art de dire non intelligemment. " +
          "On explore les frameworks (RICE, ICE, MoSCoW), la gestion des parties prenantes " +
          "et comment communiquer les décisions à l'équipe et aux clients.",
        startsAt: new Date("2026-05-07T18:30:00"),
        endsAt: new Date("2026-05-07T21:00:00"),
        locationType: "IN_PERSON" as const,
        locationName: "Le Village by CA Auvergne-Rhône-Alpes",
        locationAddress: "10 Rue des Cuirassiers, 69003 Lyon",
        videoLink: null,
        capacity: 30,
        status: "PUBLISHED" as const,
        registrations: ["julien", "lucie", "oceane", "louis", "chloe"],
        comments: [],
      },
      {
        // ── À venir 4 ──────────────────────────────────────────────────────
        slug: "demo-design-workshop-proto-juin",
        title: "Workshop Prototypage rapide — De l'idée à la démo en 2h",
        description:
          "Sprint de prototypage : chaque équipe reçoit un brief et a 2h pour créer " +
          "un prototype interactif Figma et le pitcher. Format compétitif mais bienveillant. " +
          "Idéal pour muscler sa capacité à valider des idées rapidement.",
        startsAt: new Date("2026-06-04T18:30:00"),
        endsAt: new Date("2026-06-04T21:30:00"),
        locationType: "IN_PERSON" as const,
        locationName: "Cowork'in Lyon",
        locationAddress: "25 Rue de la Barre, 69002 Lyon",
        videoLink: null,
        capacity: 24,
        status: "PUBLISHED" as const,
        registrations: ["julien", "marie", "jade"],
        comments: [],
      },
    ],
  },
  {
    // ── Circle 3 : Sport & Bien-être — Paris ─────────────────────────────────
    slug: "demo-run-club-paris",
    name: "Run Club Paris",
    description:
      "Courons ensemble dans Paris ! Sorties hebdomadaires tous les niveaux, " +
      "des joggeurs débutants aux préparations semi-marathon. " +
      "On court, on discute, on se retrouve autour d'un café après. " +
      "Rejoignez une communauté de coureurs bienveillants.",
    visibility: "PUBLIC" as const,
    category: "SPORT_WELLNESS" as const,
    city: "Paris",
    hostKey: "pierre",
    moments: [
      {
        // ── Passé ──────────────────────────────────────────────────────────
        slug: "demo-run-vincennes-janv",
        title: "Sortie du dimanche — Bois de Vincennes",
        description:
          "10 km tranquilles dans le Bois de Vincennes, allure 6'/km. " +
          "Rendez-vous à l'entrée du lac Daumesnil. Retour café-croissant en groupe. " +
          "Prévoir une tenue adaptée à la météo de janvier — il pourrait faire froid !",
        startsAt: new Date("2026-01-18T09:00:00"),
        endsAt: new Date("2026-01-18T11:00:00"),
        locationType: "IN_PERSON" as const,
        locationName: "Lac Daumesnil, Bois de Vincennes",
        locationAddress: "Lac Daumesnil, 75012 Paris",
        videoLink: null,
        capacity: 20,
        status: "PAST" as const,
        registrations: ["pierre", "antoine", "hugo", "theo", "raphael", "oceane", "louis"],
        comments: [
          { user: "antoine", content: "Belle sortie dans l'air frais ! Le café après était mérité 🏃 À dimanche prochain ?" },
          { user: "hugo",    content: "Rythme parfait pour commencer l'année. Merci Pierre pour l'orga !" },
          { user: "theo",    content: "Premier run en groupe pour moi, j'adore le concept. Je reviens sans hésiter." },
          { user: "pierre",  content: "Super groupe ce matin ! Prochaine sortie fin février, inscrivez-vous 💪" },
        ],
      },
      {
        // ── À venir 1 ──────────────────────────────────────────────────────
        slug: "demo-run-nocturne-defense-fev",
        title: "Run nocturne — La Défense by night",
        description:
          "Une expérience unique : courir à La Défense quand tout s'illumine. " +
          "8 km dans le quartier d'affaires, départ depuis l'Arche de la Défense. " +
          "Prévoir une lampe frontale et une tenue de running adaptée au froid nocturne.",
        startsAt: new Date("2026-02-26T19:30:00"),
        endsAt: new Date("2026-02-26T21:30:00"),
        locationType: "IN_PERSON" as const,
        locationName: "Parvis de La Défense",
        locationAddress: "Parvis de La Défense, 92800 Puteaux",
        videoLink: null,
        capacity: 25,
        status: "PUBLISHED" as const,
        registrations: ["pierre", "axel", "nathan", "marie", "chloe", "antoine"],
        comments: [],
      },
      {
        // ── À venir 2 ──────────────────────────────────────────────────────
        slug: "demo-run-10km-printemps-mars",
        title: "Préparation 10 km du Printemps",
        description:
          "À 6 semaines du 10 km du Printemps de Paris, on se retrouve pour un entraînement " +
          "fractionné au Parc de Belleville : échauffement, 5 × 1 km à allure course, " +
          "récupération active. Programme adapté à tous les niveaux.",
        startsAt: new Date("2026-03-22T09:30:00"),
        endsAt: new Date("2026-03-22T11:30:00"),
        locationType: "IN_PERSON" as const,
        locationName: "Parc de Belleville",
        locationAddress: "Parc de Belleville, 75020 Paris",
        videoLink: null,
        capacity: 20,
        status: "PUBLISHED" as const,
        registrations: ["pierre", "hugo", "theo", "raphael", "axel", "nathan"],
        comments: [],
      },
      {
        // ── À venir 3 ──────────────────────────────────────────────────────
        slug: "demo-run-trail-fontainebleau-avr",
        title: "Trail initiation — Forêt de Fontainebleau",
        description:
          "Découverte du trail en forêt de Fontainebleau : 12 km de sentiers balisés " +
          "avec dénivelé modéré. Session technique sur la montée/descente et le placement en pied. " +
          "Covoiturages organisés depuis Paris. Pique-nique en fin de parcours.",
        startsAt: new Date("2026-04-26T08:30:00"),
        endsAt: new Date("2026-04-26T14:00:00"),
        locationType: "IN_PERSON" as const,
        locationName: "Carrefour de l'Épine, Forêt de Fontainebleau",
        locationAddress: "Forêt de Fontainebleau, 77300 Fontainebleau",
        videoLink: null,
        capacity: 15,
        status: "PUBLISHED" as const,
        registrations: ["pierre", "antoine", "oceane", "louis", "marie", "chloe"],
        comments: [],
      },
      {
        // ── À venir 4 ──────────────────────────────────────────────────────
        slug: "demo-run-semi-marathon-prep-mai",
        title: "Longue sortie — Préparation semi-marathon",
        description:
          "18 km sur les quais de Seine, de Notre-Dame jusqu'au Pont de Grenelle et retour. " +
          "Allure endurance (5'30\"/km – 6'30\"/km). Point de ravitaillement au Trocadéro. " +
          "Pour ceux qui visent un semi en juin — allez, on y croit !",
        startsAt: new Date("2026-05-17T08:00:00"),
        endsAt: new Date("2026-05-17T11:30:00"),
        locationType: "IN_PERSON" as const,
        locationName: "Pont de l'Archevêché",
        locationAddress: "Pont de l'Archevêché, 75004 Paris",
        videoLink: null,
        capacity: 20,
        status: "PUBLISHED" as const,
        registrations: ["pierre", "hugo", "theo", "raphael", "axel", "nathan", "oceane", "louis"],
        comments: [],
      },
    ],
  },
  {
    // ── Circle 4 : Business & Entrepreneuriat — Bordeaux ─────────────────────
    slug: "demo-founders-club-bordeaux",
    name: "Founders Club Bordeaux",
    description:
      "La communauté des fondateurs et entrepreneurs de la région bordelaise. " +
      "Pitchs, retours d'expérience, partage de bonnes pratiques sur le fundraising, " +
      "la gestion d'équipe, la croissance et les galères du quotidien de fondateur. " +
      "Ambiance franche et bienveillante entre personnes qui vivent les mêmes défis.",
    visibility: "PUBLIC" as const,
    category: "BUSINESS" as const,
    city: "Bordeaux",
    hostKey: "emma",
    moments: [
      {
        // ── Passé ──────────────────────────────────────────────────────────
        slug: "demo-founders-fundraising-rex-janv",
        title: "Fundraising — Retours d'expérience de fondateurs",
        description:
          "Trois fondateurs partagent leurs aventures (et mésaventures) de levée de fonds : " +
          "comment préparer son pitch deck, négocier avec les VCs, gérer les NOs et rebondir. " +
          "Session Questions/Réponses sans langue de bois.",
        startsAt: new Date("2026-01-28T19:00:00"),
        endsAt: new Date("2026-01-28T21:30:00"),
        locationType: "IN_PERSON" as const,
        locationName: "Darwin Bordeaux",
        locationAddress: "87 Quai des Queyries, 33100 Bordeaux",
        videoLink: null,
        capacity: 40,
        status: "PAST" as const,
        registrations: ["emma", "antoine", "hugo", "axel"],
        comments: [
          { user: "antoine", content: "Très honnête sur les galères du fundraising. On voit rarement les gens parler des NOs." },
          { user: "hugo",    content: "Le conseil sur les term sheets valait le déplacement. Merci Emma pour l'orga !" },
          { user: "emma",    content: "Merci à nos trois speakers pour leur transparence. Prochain meetup en mars — Pitch Night !" },
        ],
      },
      {
        // ── À venir 1 ──────────────────────────────────────────────────────
        slug: "demo-founders-pitch-night-mars",
        title: "Pitch Night — 5 startups se lancent",
        description:
          "Cinq startups bordelaises pitchent leur projet devant un jury de fondateurs expérimentés. " +
          "3 min de pitch + 5 min de Q&A par startup. Feedback constructif garanti. " +
          "Inscriptions ouvertes pour les startups qui veulent pitcher (formulaire en DM).",
        startsAt: new Date("2026-03-25T19:00:00"),
        endsAt: new Date("2026-03-25T22:00:00"),
        locationType: "IN_PERSON" as const,
        locationName: "Darwin Bordeaux",
        locationAddress: "87 Quai des Queyries, 33100 Bordeaux",
        videoLink: null,
        capacity: 60,
        status: "PUBLISHED" as const,
        registrations: ["emma", "nathan", "theo", "chloe", "louis"],
        comments: [],
      },
      {
        // ── À venir 2 ──────────────────────────────────────────────────────
        slug: "demo-founders-growth-hacking-avr",
        title: "Growth Hacking pour startups early-stage",
        description:
          "Session en ligne : comment acquérir vos 1000 premiers clients sans budget marketing ? " +
          "Canaux organiques, Product Hunt, cold email, boucles virales et partenariats stratégiques. " +
          "Exemples concrets tirés de startups françaises en early-stage.",
        startsAt: new Date("2026-04-22T18:00:00"),
        endsAt: new Date("2026-04-22T20:00:00"),
        locationType: "ONLINE" as const,
        locationName: null,
        locationAddress: null,
        videoLink: "https://meet.google.com/founders-bx-growth",
        capacity: 150,
        status: "PUBLISHED" as const,
        registrations: ["emma", "antoine", "hugo", "axel", "nathan", "theo"],
        comments: [],
      },
      {
        // ── À venir 3 ──────────────────────────────────────────────────────
        slug: "demo-founders-legal-startup-mai",
        title: "Legal & Startup — Ce qu'il faut savoir (et ce qu'on ne vous dit pas)",
        description:
          "Avec un avocat spécialisé startups : pacte d'associés, BSPCE, CGV SaaS, " +
          "protection de la propriété intellectuelle et clauses à éviter absolument. " +
          "Format Q&A — venez avec vos vraies questions, les réponses seront directes.",
        startsAt: new Date("2026-05-20T18:30:00"),
        endsAt: new Date("2026-05-20T20:30:00"),
        locationType: "IN_PERSON" as const,
        locationName: "La Cantine Numérique Bordeaux",
        locationAddress: "4 Rue de Condé, 33064 Bordeaux",
        videoLink: null,
        capacity: 30,
        status: "PUBLISHED" as const,
        registrations: ["emma", "chloe", "louis", "antoine"],
        comments: [],
      },
      {
        // ── À venir 4 ──────────────────────────────────────────────────────
        slug: "demo-founders-summit-juin",
        title: "Bordeaux Startup Summit 2026",
        description:
          "Notre événement annuel : une journée complète avec des talks inspirants, " +
          "des ateliers thématiques et une session de networking structuré. " +
          "200 fondateurs attendus. Programme détaillé à venir sur le site.",
        startsAt: new Date("2026-06-18T09:00:00"),
        endsAt: new Date("2026-06-18T20:00:00"),
        locationType: "IN_PERSON" as const,
        locationName: "Hangar 14",
        locationAddress: "Quai des Chartrons, 33300 Bordeaux",
        videoLink: null,
        capacity: 200,
        status: "PUBLISHED" as const,
        registrations: ["emma", "hugo", "axel", "nathan"],
        comments: [],
      },
    ],
  },
  {
    // ── Circle 5 : Art & Culture — Nantes ────────────────────────────────────
    slug: "demo-aquarelles-encres",
    name: "Aquarelles & Encres",
    description:
      "Atelier de peinture aquarelle et dessin à l'encre basé à Nantes. " +
      "On se retrouve deux fois par mois pour peindre ensemble dans une atmosphère conviviale. " +
      "Débutants très bienvenus — ici, on apprend en faisant et on progresse ensemble. " +
      "Tout le matériel de base est fourni lors des premières séances.",
    visibility: "PUBLIC" as const,
    category: "ART_CULTURE" as const,
    city: "Nantes",
    hostKey: "lea",
    moments: [
      {
        // ── Passé ──────────────────────────────────────────────────────────
        slug: "demo-aquarelles-botaniques-janv",
        title: "Séance aquarelle — Botaniques hivernales",
        description:
          "Peinture de compositions botaniques hivernales : branches de houx, baies et feuillages. " +
          "Techniques humide-sur-humide et mouillé-sur-sec. Modèles fournis. " +
          "Durée : 2h30 avec pause tisane et retour critique en groupe.",
        startsAt: new Date("2026-01-24T14:00:00"),
        endsAt: new Date("2026-01-24T17:00:00"),
        locationType: "IN_PERSON" as const,
        locationName: "Atelier du Bonheur",
        locationAddress: "18 Rue de la Juiverie, 44000 Nantes",
        videoLink: null,
        capacity: 12,
        status: "PAST" as const,
        registrations: ["lea", "marie", "clara"],
        comments: [
          { user: "marie",  content: "J'avais jamais peint à l'aquarelle et je suis rentrée avec une belle toile ! Merci Léa 🎨" },
          { user: "clara",  content: "Ambiance super chouette, Léa est une super pédagogue. J'attends le prochain avec impatience !" },
          { user: "lea",    content: "Ravie ! Prochain atelier en mars sur le carnet de voyage. Inscrivez-vous 🌍" },
        ],
      },
      {
        // ── À venir 1 ──────────────────────────────────────────────────────
        slug: "demo-aquarelles-carnet-voyage-mars",
        title: "Carnet de voyage — Techniques mixtes",
        description:
          "Le carnet de voyage comme outil créatif : mélange d'aquarelle, d'encre et de collage. " +
          "On travaille sur des photos de voyages personnels ou des images de magazines fournis. " +
          "À la fin, chaque participant repart avec 3 pages de carnet terminées.",
        startsAt: new Date("2026-03-14T14:00:00"),
        endsAt: new Date("2026-03-14T17:30:00"),
        locationType: "IN_PERSON" as const,
        locationName: "Atelier du Bonheur",
        locationAddress: "18 Rue de la Juiverie, 44000 Nantes",
        videoLink: null,
        capacity: 12,
        status: "PUBLISHED" as const,
        registrations: ["lea", "ines", "jade", "lucie"],
        comments: [],
      },
      {
        // ── À venir 2 ──────────────────────────────────────────────────────
        slug: "demo-aquarelles-expo-preparation-avr",
        title: "Expo collective — Séance de préparation",
        description:
          "Préparation de notre expo collective de mai : finalisation des œuvres, " +
          "encadrement, accrochage et rédaction des cartels. " +
          "Pour les membres qui participent à l'expo — inscription obligatoire pour la logistique.",
        startsAt: new Date("2026-04-11T10:00:00"),
        endsAt: new Date("2026-04-11T13:00:00"),
        locationType: "IN_PERSON" as const,
        locationName: "Atelier du Bonheur",
        locationAddress: "18 Rue de la Juiverie, 44000 Nantes",
        videoLink: null,
        capacity: 10,
        status: "PUBLISHED" as const,
        registrations: ["lea", "marie", "clara", "ines"],
        comments: [],
      },
      {
        // ── À venir 3 ──────────────────────────────────────────────────────
        slug: "demo-aquarelles-plein-air-loire-mai",
        title: "Plein air — La Loire en peinture",
        description:
          "Sortie peinture sur les bords de Loire : on installe nos chevalets face au fleuve " +
          "et on peint le paysage. Chaque peintre trouve son point de vue, on partage nos approches. " +
          "Matériel à apporter : aquarelles + papier grain torchon + pinceau. Pique-nique collectif après.",
        startsAt: new Date("2026-05-16T10:00:00"),
        endsAt: new Date("2026-05-16T14:00:00"),
        locationType: "IN_PERSON" as const,
        locationName: "Quai de la Fosse",
        locationAddress: "Quai de la Fosse, 44000 Nantes",
        videoLink: null,
        capacity: 15,
        status: "PUBLISHED" as const,
        registrations: ["lea", "jade", "lucie"],
        comments: [],
      },
      {
        // ── À venir 4 ──────────────────────────────────────────────────────
        slug: "demo-aquarelles-encre-chine-juin",
        title: "Workshop encre de Chine — Lavis et sumi-e",
        description:
          "Initiation à l'encre de Chine et au sumi-e japonais : dilutions, lavis, tâches, " +
          "tracés au pinceau. On explore les propriétés uniques de l'encre et comment la maîtriser. " +
          "Exercices progressifs sur des sujets simples : bambou, montagne, eau.",
        startsAt: new Date("2026-06-13T14:00:00"),
        endsAt: new Date("2026-06-13T17:00:00"),
        locationType: "IN_PERSON" as const,
        locationName: "Atelier du Bonheur",
        locationAddress: "18 Rue de la Juiverie, 44000 Nantes",
        videoLink: null,
        capacity: 12,
        status: "PUBLISHED" as const,
        registrations: ["lea", "marie", "clara", "jade"],
        comments: [],
      },
    ],
  },
  {
    // ── Circle 6 : Sciences & Éducation — En ligne ───────────────────────────
    slug: "demo-numerique-planete",
    name: "Numérique & Planète",
    description:
      "Explorer l'impact du numérique sur l'environnement et inversement. " +
      "Échanges entre passionnés de tech et d'écologie : empreinte carbone du numérique, " +
      "IA et sobriété, solutions open source, frugalité numérique et transition juste. " +
      "Communauté 100 % en ligne, ouverte à toute la France.",
    visibility: "PUBLIC" as const,
    category: "SCIENCE_EDUCATION" as const,
    city: null,
    hostKey: "baptiste",
    moments: [
      {
        // ── Passé ──────────────────────────────────────────────────────────
        slug: "demo-numerique-ia-impact-env-janv",
        title: "IA & Impact environnemental — Les vrais chiffres",
        description:
          "L'IA générative consomme énormément d'eau et d'énergie — mais combien exactement ? " +
          "On décortique les chiffres disponibles, les limites des études, " +
          "et on discute des leviers pour réduire l'impact sans renoncer à l'innovation.",
        startsAt: new Date("2026-01-29T19:00:00"),
        endsAt: new Date("2026-01-29T21:00:00"),
        locationType: "ONLINE" as const,
        locationName: null,
        locationAddress: null,
        videoLink: "https://meet.google.com/num-planete-jan",
        capacity: 200,
        status: "PAST" as const,
        registrations: ["baptiste", "chloe", "antoine", "marie", "hugo", "clara", "theo", "raphael"],
        comments: [
          { user: "chloe",   content: "Les chiffres sur la consommation d'eau des datacenters m'ont scotchée. Très instructif." },
          { user: "antoine", content: "J'ai aimé la nuance sur le scope 3 — souvent oublié dans les calculs. Beau travail de recherche." },
          { user: "marie",   content: "Super session, hâte de voir la prochaine sur les solutions Green Tech !" },
          { user: "baptiste",content: "Merci pour la qualité des échanges ! On creuse ça en mars avec des intervenants terrain." },
          { user: "theo",    content: "La comparaison GPT-4 vs GPT-3.5 sur l'énergie était vraiment parlante. Merci Baptiste." },
        ],
      },
      {
        // ── À venir 1 ──────────────────────────────────────────────────────
        slug: "demo-numerique-green-tech-mars",
        title: "Green Tech — Solutions numériques pour la transition",
        description:
          "Panorama des startups et projets open source qui utilisent le numérique " +
          "au service de la transition écologique : grids intelligentes, mobilité, " +
          "agriculture de précision, monitoring environnemental. Que vaut vraiment le greenwashing tech ?",
        startsAt: new Date("2026-03-18T19:00:00"),
        endsAt: new Date("2026-03-18T21:00:00"),
        locationType: "ONLINE" as const,
        locationName: null,
        locationAddress: null,
        videoLink: "https://meet.google.com/num-planete-mar",
        capacity: 200,
        status: "PUBLISHED" as const,
        registrations: ["baptiste", "jade", "axel", "lucie", "nathan", "oceane", "chloe", "antoine"],
        comments: [],
      },
      {
        // ── À venir 2 ──────────────────────────────────────────────────────
        slug: "demo-numerique-sobriete-mythes-avr",
        title: "Sobriété numérique — Mythes et réalités",
        description:
          "Éteindre sa caméra en visio, c'est vraiment utile ? " +
          "On démêle les vraies économies des faux gestes et on parle de ce qui compte vraiment : " +
          "allongement de la durée de vie des terminaux, efficacité des datacenters, effet rebond.",
        startsAt: new Date("2026-04-08T19:00:00"),
        endsAt: new Date("2026-04-08T21:00:00"),
        locationType: "ONLINE" as const,
        locationName: null,
        locationAddress: null,
        videoLink: "https://meet.google.com/num-planete-avr",
        capacity: 200,
        status: "PUBLISHED" as const,
        registrations: ["baptiste", "marie", "hugo", "theo", "raphael", "jade", "axel"],
        comments: [],
      },
      {
        // ── À venir 3 ──────────────────────────────────────────────────────
        slug: "demo-numerique-open-source-mai",
        title: "Open Source & Bien commun numérique",
        description:
          "L'open source comme infrastructure critique : qui finance, qui maintient, " +
          "quels modèles économiques sont viables ? On discute aussi des communs numériques " +
          "et de pourquoi Wikipedia, OpenStreetMap ou Linux sont des miracles fragiles.",
        startsAt: new Date("2026-05-13T19:00:00"),
        endsAt: new Date("2026-05-13T21:00:00"),
        locationType: "ONLINE" as const,
        locationName: null,
        locationAddress: null,
        videoLink: "https://meet.google.com/num-planete-mai",
        capacity: 200,
        status: "PUBLISHED" as const,
        registrations: ["baptiste", "lucie", "nathan", "oceane", "chloe", "antoine", "marie"],
        comments: [],
      },
      {
        // ── À venir 4 ──────────────────────────────────────────────────────
        slug: "demo-numerique-frugalite-atelier-juin",
        title: "Atelier Frugalité numérique — Passer à l'acte",
        description:
          "Un atelier pratique pour auditer ses usages numériques et passer à l'acte : " +
          "paramètres de confidentialité, alternatives à Google, outils de mesure d'empreinte, " +
          "et plan d'action personnalisé. On repart avec une liste d'actions concrètes.",
        startsAt: new Date("2026-06-10T19:00:00"),
        endsAt: new Date("2026-06-10T21:30:00"),
        locationType: "ONLINE" as const,
        locationName: null,
        locationAddress: null,
        videoLink: "https://meet.google.com/num-planete-juin",
        capacity: 200,
        status: "PUBLISHED" as const,
        registrations: ["baptiste", "hugo", "clara", "theo", "raphael", "jade"],
        comments: [],
      },
    ],
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🌱 Seed données démo — The Playground");
  console.log("══════════════════════════════════════════\n");

  // 1. Utilisateurs
  console.log("👤 Utilisateurs...");
  const userMap: Record<string, string> = {};

  for (const { key, email, firstName, lastName } of USERS) {
    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name: `${firstName} ${lastName}`,
        firstName,
        lastName,
        onboardingCompleted: true,
        emailVerified: new Date(),
      },
      update: {
        name: `${firstName} ${lastName}`,
        firstName,
        lastName,
        onboardingCompleted: true,
        emailVerified: new Date(),
      },
    });
    userMap[key] = user.id;
    console.log(`  ✓ ${user.email}  →  ${user.name}`);
  }

  // 2. Circles, Moments, Registrations, Comments
  for (const circleData of DEMO_DATA) {
    const hostUserId = userMap[circleData.hostKey];
    console.log(`\n⭕ Circle: ${circleData.name}`);

    const circle = await prisma.circle.upsert({
      where: { slug: circleData.slug },
      create: {
        slug: circleData.slug,
        name: circleData.name,
        description: circleData.description,
        visibility: circleData.visibility,
        category: circleData.category,
        city: circleData.city ?? null,
        isDemo: true,
      },
      update: {
        name: circleData.name,
        description: circleData.description,
        visibility: circleData.visibility,
        category: circleData.category,
        city: circleData.city ?? null,
        isDemo: true,
      },
    });

    // Membership Host
    await prisma.circleMembership.upsert({
      where: { userId_circleId: { userId: hostUserId, circleId: circle.id } },
      create: { userId: hostUserId, circleId: circle.id, role: "HOST" },
      update: { role: "HOST" },
    });

    const playersInCircle = new Set<string>();

    for (const momentData of circleData.moments) {
      const moment = await prisma.moment.upsert({
        where: { slug: momentData.slug },
        create: {
          slug: momentData.slug,
          circleId: circle.id,
          createdById: hostUserId,
          title: momentData.title,
          description: momentData.description,
          startsAt: momentData.startsAt,
          endsAt: momentData.endsAt ?? null,
          locationType: momentData.locationType,
          locationName: momentData.locationName ?? null,
          locationAddress: momentData.locationAddress ?? null,
          videoLink: momentData.videoLink ?? null,
          capacity: momentData.capacity,
          price: 0,
          currency: "EUR",
          status: momentData.status,
        },
        update: {
          title: momentData.title,
          description: momentData.description,
          startsAt: momentData.startsAt,
          endsAt: momentData.endsAt ?? null,
          locationType: momentData.locationType,
          locationName: momentData.locationName ?? null,
          locationAddress: momentData.locationAddress ?? null,
          videoLink: momentData.videoLink ?? null,
          status: momentData.status,
          capacity: momentData.capacity,
        },
      });
      console.log(`  ${momentData.status === "PAST" ? "↩" : "→"} ${momentData.title}`);

      // Inscriptions
      for (const userKey of momentData.registrations) {
        const userId = userMap[userKey];
        if (!userId) continue;
        await prisma.registration.upsert({
          where: { momentId_userId: { momentId: moment.id, userId } },
          create: { momentId: moment.id, userId, status: "REGISTERED", paymentStatus: "NONE" },
          update: { status: "REGISTERED" },
        });
        if (userKey !== circleData.hostKey) playersInCircle.add(userId);
      }

      // Commentaires (idempotent — un commentaire par utilisateur par Moment)
      for (const { user: userKey, content } of momentData.comments) {
        const userId = userMap[userKey];
        if (!userId) continue;
        const existing = await prisma.comment.findFirst({
          where: { momentId: moment.id, userId },
        });
        if (!existing) {
          await prisma.comment.create({
            data: { momentId: moment.id, userId, content },
          });
        }
      }
    }

    // Memberships Players (dérivés des inscriptions)
    for (const playerId of playersInCircle) {
      await prisma.circleMembership.upsert({
        where: { userId_circleId: { userId: playerId, circleId: circle.id } },
        create: { userId: playerId, circleId: circle.id, role: "PLAYER" },
        update: {},
      });
    }

    const memberCount = playersInCircle.size + 1; // +1 pour le Host
    console.log(`  ✓ ${memberCount} membres (1 host + ${playersInCircle.size} players)`);
  }

  // Reset dashboardMode pour le user "blank slate" (thomas) — garantit le flux welcome page
  await prisma.user.updateMany({
    where: { email: "thomas@demo.playground" },
    data: { dashboardMode: null },
  });
  console.log("  ✓ thomas@demo.playground — dashboardMode remis à null");

  // Récapitulatif
  console.log("\n✅ Données démo injectées avec succès.\n");
  console.log("Impersonation (dev uniquement) :");
  for (const { email } of USERS) {
    console.log(`  http://localhost:3000/api/dev/impersonate?email=${encodeURIComponent(email)}`);
  }
  console.log();
}

main()
  .catch((e) => {
    console.error("\n❌ Erreur :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
