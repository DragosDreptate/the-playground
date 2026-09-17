import type { EventContext } from "./event-context";

type IssueForPrompt = {
  issueShortId: string;
  issueTitle: string;
  culprit: string;
  level: string;
  platform: string;
  metadata: { type?: string; value?: string; filename?: string; function?: string };
};

const TAG_KEYS_OF_INTEREST = [
  "cron",
  "environment",
  "release",
  "url",
  "transaction",
  "route",
  "server_action",
  "runtime",
  // Client et nature de la capture : la checklist d'impact s'en sert déjà,
  // sans jamais avoir reçu l'information.
  "browser",
  "client_os",
  "handled",
  "mechanism",
];

/**
 * Carte des zones de l'app, pour que le modèle repère une conclusion
 * impossible (« inscription cassée » sur une landing qui n'a aucun formulaire).
 *
 * GROSSIÈRE PAR CONCEPTION, au niveau des zones et jamais des noms de Server
 * Actions : une carte trop fine devient fausse au premier refactoring, et une
 * carte fausse ment avec autant d'aplomb que l'absence de carte.
 *
 * `source` n'est pas affiché au modèle : il sert au test qui vérifie que
 * chaque route citée existe encore, seul mécanisme qui empêche cette carte de
 * mentir en silence.
 */
export const ROUTE_MAP: { pattern: string; source: string; description: string }[] = [
  {
    pattern: "/ et /[locale]",
    source: "src/app/[locale]/page.tsx",
    description: "landing marketing publique, AUCUNE Server Action métier",
  },
  {
    pattern: "/m/[slug]",
    source: "src/app/[locale]/(routes)/m/[slug]",
    description: "page événement : inscription, commentaires, check-in",
  },
  {
    pattern: "/circles/[slug]",
    source: "src/app/[locale]/(routes)/circles/[slug]",
    description: "page Communauté : adhésion, consultation",
  },
  {
    pattern: "/dashboard/*",
    source: "src/app/[locale]/(routes)/dashboard",
    description: "espace organisateur : création et édition d'événements et de Communautés",
  },
  {
    pattern: "/explorer",
    source: "src/app/[locale]/(routes)/explorer",
    description: "page Découvrir, consultation seule",
  },
  {
    pattern: "/auth/*",
    source: "src/app/[locale]/auth",
    description: "connexion par magic link",
  },
  {
    pattern: "/api/cron/*",
    source: "src/app/api/cron",
    description: "jobs planifiés, aucun utilisateur derrière",
  },
];

function formatTags(tags: Record<string, string>): string {
  const pairs = TAG_KEYS_OF_INTEREST.filter((k) => tags[k]).map((k) => `${k}=${tags[k]}`);
  return pairs.length === 0 ? "(aucun tag utile)" : pairs.join(", ");
}

function formatHeaders(headers: Record<string, string>): string {
  const pairs = Object.entries(headers).map(([k, v]) => `${k}=${v}`);
  return pairs.length === 0 ? "(aucun en-tête disponible)" : pairs.join(", ");
}

/**
 * Volumétrie, affichée UNIQUEMENT quand elle porte une information.
 *
 * Un signal constant n'est pas un signal : l'analyse tourne à la création de
 * l'issue, donc `eventCount` vaut 1 sur toute alerte réelle, et `userCount`
 * vaut 0 partout faute de `Sentry.setUser` dans le projet. Les afficher
 * quand même fournissait au modèle un argument permanent en faveur de
 * « bruit / aucun impact », y compris sur des pannes qui bloquaient du monde.
 */
function formatCounts(context: EventContext): string | null {
  const parts: string[] = [];
  if (context.eventCount !== undefined && context.eventCount > 1) {
    parts.push(`${context.eventCount} occurrences déjà enregistrées`);
  }
  if (context.userCount !== undefined && context.userCount > 0) {
    parts.push(`${context.userCount} utilisateur(s) identifié(s) touché(s)`);
  }
  return parts.length === 0 ? null : parts.join(", ");
}

function formatRouteMap(): string {
  return ROUTE_MAP.map((r) => `- \`${r.pattern}\` : ${r.description}`).join("\n");
}

export function buildAnalysisPrompt(issue: IssueForPrompt, context: EventContext): string {
  // Le repli ne CONCLUT pas : beaucoup d'événements serveur (erreurs d'auth
  // notamment) arrivent sans entrée `request` alors qu'un visiteur était bien
  // en train d'agir. Annoncer « probablement un cron » orientait le diagnostic
  // vers un job de fond inexistant.
  const requestLine = context.requestUrl
    ? `${context.requestMethod ?? "?"} ${context.requestUrl}`
    : "(l'événement ne porte pas d'entrée requête — cela ne prouve PAS qu'aucun utilisateur n'agissait)";
  const counts = formatCounts(context);

  return `Analyse cette erreur Sentry d'une application Next.js (The Playground - plateforme de communautés/événements).

Tu produis une analyse LISIBLE PAR UN NON-TECHNICIEN. Ton objectif : expliquer QUI a déclenché l'erreur, QUOI est cassé côté produit, et COMMENT l'utilisateur le ressent. Les détails techniques viennent en dernier, condensés.

## Contexte de l'erreur

Issue: ${issue.issueShortId}
Titre: ${issue.issueTitle}
Culprit: ${issue.culprit}
Level: ${issue.level}
Platform: ${issue.platform}
Metadata: type=${issue.metadata.type}, filename=${issue.metadata.filename}, function=${issue.metadata.function}
Tags pertinents: ${formatTags(context.tags)}
Request: ${requestLine}
En-têtes de la requête: ${formatHeaders(context.requestHeaders)}${counts ? `\nVolumétrie: ${counts}` : ""}

Stacktrace et contexte:
${context.stacktrace || "(aucune stacktrace disponible)"}

## Carte des zones de l'app

${formatRouteMap()}

Sers-t'en pour écarter l'impossible : une conséquence annoncée sur une zone qui ne porte pas cette fonctionnalité est forcément fausse.

## Réponds UNIQUEMENT avec un JSON valide

{
  "urgency": "critical|high|medium|low|noise",
  "trigger": "Phrase courte (1-2) qui répond à : qu'est-ce qui a provoqué cette erreur ? Précise le contexte d'activité (page, action utilisateur, cron, webhook, job). Langage métier, pas technique.",
  "functionalConsequence": "Phrase courte (1-2) qui répond à : qu'est-ce qui est cassé côté produit ? En termes métier (inscription, paiement, création d'événement, rappel, check-in, commentaire, affichage). PAS de jargon DB/framework.",
  "userImpact": {
    "level": "none|silent|degraded|blocking",
    "description": "Phrase courte (1-2) qui commence par le rôle concerné (un participant, un organisateur, un visiteur anonyme, aucun utilisateur). Décrit CE QUE RESSENT l'utilisateur : écran d'erreur, email pas reçu, bouton qui ne répond pas, etc. PAS de jargon."
  },
  "technical": "Bloc condensé (3 phrases max) réservé aux devs : cause probable + fichier/fonction à investiguer + piste de correction. Peut contenir du jargon."
}

## Motifs de BRUIT connus (à vérifier EN PREMIER)

Mécanisme Next.js à connaître : **tout POST sur une route de page App Router est interprété comme un appel de Server Action**. Sans identifiant d'action valide dans le corps, Next lève \`Failed to find Server Action\`. Un POST arbitraire envoyé par un scanner produit donc exactement cette erreur, **sans qu'aucun code applicatif ne soit atteint**.

Signatures de scan ou de bruit, à reconnaître :
- Chemin qui n'existe pas chez nous : \`.php\`, \`/wp-admin\`, \`/wp-login\`, \`/.env\`, \`/.git\`, \`/phpmyadmin\`. L'app n'a AUCUN fichier PHP : une telle requête est un scan, sans exception.
- \`x-vercel-ip-as-number\` d'un hébergeur ou d'un cloud plutôt que d'un FAI résidentiel, surtout avec un User-Agent de navigateur grand public (falsifié).
- Corps \`multipart/form-data\` volumineux (\`content-type\` + \`content-length\`) sur une route de page sans formulaire.
- Script tiers (PostHog, GA, Stripe.js), extension de navigateur, erreur pendant \`pagehide\` / \`unload\`.

Si un motif est reconnu : \`urgency: "noise"\`, \`userImpact.level: "none"\`, et NOMME le motif dans \`trigger\` (ex. « scan automatisé depuis un hébergeur, chemin /index.php inexistant »).

🚫 N'attribue JAMAIS à une route une fonctionnalité que la carte des zones ne lui donne pas : écrire « l'inscription à la newsletter échoue » sur une page qui n'a pas de formulaire fabrique une panne qui n'existe pas.

## Heuristiques pour le TRIGGER

Ordre de priorité :
1. Si tag \`cron\` présent → "Le cron automatique <nom> (<fréquence si connue>). Aucune action utilisateur."
2. Si request URL présente :
   - \`/api/cron/*\` → cron
   - \`/api/webhook/*\` ou \`/api/*/webhook\` → "Un webhook <service> reçu par la plateforme"
   - \`/api/*\` → "Un appel API depuis le frontend"
   - \`/m/[slug]\` → "Un visiteur/participant consulte une page événement"
   - \`/circles/[slug]\` → "Un visiteur consulte une page Communauté"
   - \`/dashboard/*\` → "Un organisateur utilise son dashboard"
   - \`/explorer\` → "Un visiteur parcourt la page Découvrir"
   - Autre → cite le chemin
3. Si la stack contient une server action nommée (\`createMoment\`, \`registerToMoment\`, etc.) → "Un utilisateur a lancé l'action <nom> (<ce que ça fait en clair>)"
4. Sinon, regarder les noms de fichiers inApp pour déduire le contexte (email/, stripe/, auth/...)

## Heuristiques pour la FUNCTIONAL CONSEQUENCE

Traduire la partie technique en impact produit concret :
- Query DB qui timeout pendant envoi rappels → "Les rappels email n'ont pas pu être envoyés pour ce run"
- Erreur Stripe webhook → "Un paiement n'a pas été confirmé côté plateforme"
- Erreur dans server action \`registerToMoment\` → "Une inscription à un événement n'a pas pu aboutir"
- Erreur OG image generation → "L'aperçu social (OG image) d'un événement n'est pas généré"
- Erreur auth magic link → "L'envoi du magic link de connexion a échoué"

Ne PAS dire "la query findMany a échoué" — dire ce que ça représente produit.

## Heuristiques pour USER IMPACT

Niveau (\`level\`) :
- "none" = l'utilisateur ne perçoit absolument rien (script tiers, handler pagehide/unload, erreur silencieuse, bot, cron sans conséquence visible immédiate)
- "silent" = erreur visible uniquement en devtools, aucune gêne fonctionnelle
- "degraded" = expérience dégradée mais utilisable (feature secondaire cassée, notification manquante, fallback, latence)
- "blocking" = l'utilisateur est bloqué et ne peut pas accomplir son action

Checklist :
1. Script tiers (PostHog, GA, Stripe.js, extension) ? → level ≤ silent
2. Pendant pagehide/unload/visibilitychange/beforeunload ? → level = none
3. Handled (try/catch, mechanism.handled=true) ? → level ≤ silent dans la plupart des cas, SAUF si l'utilisateur voit une page 500 ou un message d'erreur
4. Crash visuel prouvé par la stack ou le contexte ? → degraded ou blocking

⚠️ L'absence de ligne « Volumétrie » ne signifie RIEN : ce projet n'attache pas d'identité aux erreurs, et l'analyse tourne dès la première occurrence. Ne JAMAIS en déduire que personne n'est touché.

Description (\`userImpact.description\`) :
- Commence par le rôle : "Un participant...", "Un organisateur...", "Un visiteur anonyme...", "Aucun utilisateur..."
- Décrit CE QU'IL VOIT OU NE VOIT PAS : "verra un écran 500", "ne recevra pas son email de rappel", "ne pourra pas cliquer sur Publier", "reste sur la page blanche quelques secondes puis réessaye"
- Dans le doute, préfère "none"/"silent" et dis-le franchement ("aucun utilisateur affecté directement pour ce run")

## Heuristiques pour URGENCY

- "critical" = perte de données, paiement cassé, auth cassée
- "high" = fonctionnalité principale cassée pour de vrais utilisateurs
- "medium" = bug visible mais contournable
- "low" = cosmétique, edge case rare
- "noise" = extension navigateur, bot, erreur non-actionnable

## Règle d'or

Reste PRÉCIS quand les données permettent de conclure : ne dis jamais "Une erreur s'est produite" si un tag, une URL ou une stack désigne le déclencheur.

Quand elles ne le permettent PAS, dis-le franchement et nomme la donnée qui manque (ex. « origine indéterminée : aucune stacktrace applicative ni en-tête de requête »). Une incertitude assumée vaut mieux qu'une hypothèse présentée comme un fait : c'est ce qui décide si on réveille quelqu'un pour rien.

INTERDIT dans tous les cas : énumérer des hypothèses alternatives pour donner le change ("inscription, création d'événement, ou autre interaction clé"). Une liste de possibilités est l'aveu d'une devinette — dans ce cas, dis que tu ne peux pas trancher et nomme la donnée manquante.

Si tu hésites à mettre du jargon, demande-toi : est-ce qu'un organisateur non-tech comprendrait ? Si non → reformule. Les seules sections où le jargon est permis sont \`technical\` et le culprit implicite.`;
}
