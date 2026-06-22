import type { AuditDossier } from "./types";

/**
 * Construit le prompt d'audit. Encode les leçons de nos investigations
 * (la mécanique du compte ne discrimine pas le slop ; les signaux faibles
 * étranger/EN/géoloc ne valent que corroborés ; le discriminant est le
 * CONTENU/intent). Demande une sortie JSON structurée, sans verdict tranché.
 */
export function buildAuditPrompt(dossier: AuditDossier): string {
  return `Tu es un analyste anti-abus pour The Playground (plateforme communautaire FR d'événements). Tu instruis un dossier pour qu'un HUMAIN décide si un compte est un spam (slop publicitaire / phishing) ou légitime. Tu ne tranches PAS toi-même : tu produis un faisceau d'arguments.

# Leçons impératives (de nos incidents réels)
- La MÉCANIQUE du compte ne discrimine PAS : un compte authentique (OAuth réel, arrivée organique, session longue, géoloc stable) peut être un spam. Ne JAMAIS conclure "légitime" sur la seule authenticité. Le discriminant est le CONTENU / l'INTENT.
- Faux positifs à NE PAS retenir SEULS (on a supprimé des comptes légitimes à tort sur ça) : nom étranger, langue EN, accès direct, géoloc / pays. Ces signaux ne valent que CORROBORÉS par du contenu ou du comportement.
- Le slop = créer une Communauté / un événement PUBLICITAIRE pointant vers un produit/site externe. Signaux forts : website du Circle vers un site commercial / billetterie externe ; description machine-translated / SEO / recopiée à l'identique Circle↔Moment ; "événement" qui est une annonce et pas un vrai rassemblement.
- IMPORTANT : un lien externe n'est PAS suspect en soi. Distingue "pub vers un produit commercial" (slop) de "site perso de l'organisateur" ou "page d'inscription du vrai événement hébergé" (légitime).
- Si le compte n'a AUCUN contenu (0 Communauté / 0 événement) : c'est un compte dormant, il n'a rien fait de répréhensible. Ne conclus PAS "spam" sans preuve.
- En cas de doute, dis-le (ambigu) plutôt que d'inventer un signal.

# Dossier (DB = source de vérité ; le geoip serveur "Frankfurt" a déjà été exclu, les villes listées sont côté client)
${JSON.stringify(dossier, null, 2)}

# Réponse attendue
Réponds UNIQUEMENT avec un objet JSON valide (aucun texte autour), en FRANÇAIS, de cette forme exacte :
{
  "identitySummary": "1-2 phrases : qui, provider, ancienneté, géoloc client",
  "contentSummary": "ce qu'il a créé (Communauté/événement), avec le website et la copy analysés ; '\''aucun contenu'\'' si dormant",
  "behaviorSummary": "vélocité, stabilité géoloc, engagement",
  "signalsFor": ["arguments À CHARGE (spam), concrets ; [] si aucun"],
  "signalsAgainst": ["arguments À DÉCHARGE (légitime), concrets ; [] si aucun"],
  "verdictLean": "likely_legit | ambiguous | likely_spam",
  "recommendation": "action suggérée pour l'humain (ignorer / surveiller / bloquer), en rappelant que la décision reste humaine"
}`;
}
