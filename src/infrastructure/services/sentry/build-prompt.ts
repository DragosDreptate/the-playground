type IssueForPrompt = {
  issueShortId: string;
  issueTitle: string;
  culprit: string;
  level: string;
  platform: string;
  metadata: { type?: string; value?: string; filename?: string; function?: string };
};

type ContextForPrompt = {
  stacktrace: string;
  tags: Record<string, string>;
  requestUrl?: string;
  requestMethod?: string;
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
];

function formatTags(tags: Record<string, string>): string {
  const pairs = TAG_KEYS_OF_INTEREST.filter((k) => tags[k]).map((k) => `${k}=${tags[k]}`);
  return pairs.length === 0 ? "(aucun tag utile)" : pairs.join(", ");
}

export function buildAnalysisPrompt(issue: IssueForPrompt, context: ContextForPrompt): string {
  const requestLine = context.requestUrl
    ? `${context.requestMethod ?? "?"} ${context.requestUrl}`
    : "(aucune request HTTP — probablement un job background, cron ou server action)";

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

Stacktrace et contexte:
${context.stacktrace || "(aucune stacktrace disponible)"}

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

## Heuristiques pour le TRIGGER

Ordre de priorité :
1. Si tag \`cron\` présent → "Le cron automatique <nom> (<fréquence si connue>). Aucune action utilisateur."
2. Si request URL présente :
   - \`/api/cron/*\` → cron
   - \`/api/webhook/*\` ou \`/api/*/webhook\` → "Un webhook <service> reçu par la plateforme"
   - \`/api/*\` → "Un appel API depuis le frontend"
   - \`/m/[slug]\` → "Un visiteur/participant consulte une page événement"
   - \`/c/[slug]\` → "Un visiteur consulte une page Communauté"
   - \`/dashboard/*\` → "Un organisateur utilise son dashboard"
   - \`/explorer\` → "Un visiteur parcourt la page Découvrir"
   - Autre → cite le chemin
3. Si la stack contient une server action nommée (\`createMoment\`, \`registerToMoment\`, etc.) → "Un utilisateur a lancé l'action <nom> (<ce que ça fait en clair>)"
4. Sinon, regarder les noms de fichiers inApp pour déduire le contexte (email/, stripe/, auth/...)

Ne JAMAIS dire "Une erreur s'est produite". Sois spécifique.

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

Si tu hésites à mettre du jargon, demande-toi : est-ce qu'un organisateur non-tech comprendrait ? Si non → reformule. Les seules sections où le jargon est permis sont \`technical\` et le culprit implicite.`;
}
