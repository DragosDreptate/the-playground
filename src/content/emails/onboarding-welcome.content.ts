/**
 * Contenu de l'email d'onboarding — Lettre du fondateur.
 *
 * Pour modifier le texte, éditer `onboarding-welcome.md` (FR) ou
 * `onboarding-welcome.en.md` (EN) dans ce dossier. Ce fichier les parse et
 * exporte un objet typé par langue, consommé par le template React Email.
 * La dernière section (`## Clôture` ou `## Closing`) porte la fin de la lettre.
 */

import fs from "node:fs";
import path from "node:path";

export type OnboardingWelcomeContent = {
  subject: string;
  preview: string;
  replyTo: string;
  senderName: string;
  greeting: string;
  greetingFallback: string;
  signature: string;
  signatureSubline: string;
  footer: string;
  intro: string[];
  sections: { label: string; paragraphs: string[] }[];
  highlight: string | null;
  conclusion: string | null;
  closingParagraphs: string[];
};

const CLOSING_LABELS = ["clôture", "closing"];

function parse(filePath: string): OnboardingWelcomeContent {
  const raw = fs.readFileSync(filePath, "utf-8");

  // --- Frontmatter ---
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) throw new Error(`Frontmatter manquant dans ${path.basename(filePath)}`);

  const meta: Record<string, string> = {};
  for (const line of fmMatch[1].split("\n")) {
    const sep = line.indexOf(":");
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    // Supprime les guillemets optionnels autour de la valeur
    const val = line.slice(sep + 1).trim().replace(/^["']|["']$/g, "");
    meta[key] = val;
  }

  // --- Body (après le frontmatter) ---
  const body = raw.slice(fmMatch[0].length).trim();

  // Découpe par sections ## (le texte avant le premier ## = intro)
  const sectionSplits = body.split(/^## /m);
  const introRaw = sectionSplits[0].trim();
  const intro = splitParagraphs(introRaw);

  const sections: { label: string; paragraphs: string[] }[] = [];
  let highlight: string | null = null;
  let conclusion: string | null = null;
  let closingParagraphs: string[] = [];

  for (let i = 1; i < sectionSplits.length; i++) {
    const block = sectionSplits[i];
    const newlineIdx = block.indexOf("\n");
    const label = block.slice(0, newlineIdx).trim();
    const content = block.slice(newlineIdx).trim();

    if (CLOSING_LABELS.includes(label.toLowerCase())) {
      closingParagraphs = splitParagraphs(content);
      continue;
    }

    // Extraire le highlight (blockquote >) et la conclusion (texte après le blockquote)
    const lines = content.split("\n");
    const paragraphLines: string[] = [];
    const afterHighlight: string[] = [];
    let inAfterHighlight = false;

    for (const line of lines) {
      if (line.startsWith("> ")) {
        highlight = line.slice(2).trim();
        inAfterHighlight = true;
      } else if (inAfterHighlight) {
        afterHighlight.push(line);
      } else {
        paragraphLines.push(line);
      }
    }

    if (afterHighlight.length > 0) {
      const afterText = afterHighlight.join("\n").trim();
      if (afterText) conclusion = afterText;
    }

    sections.push({
      label,
      paragraphs: splitParagraphs(paragraphLines.join("\n")),
    });
  }

  return {
    subject: meta.subject ?? "",
    preview: meta.preview ?? "",
    replyTo: meta.replyTo ?? "",
    senderName: meta.senderName ?? "",
    greeting: meta.greeting ?? "",
    greetingFallback: meta.greetingFallback ?? "",
    signature: meta.signature ?? "",
    signatureSubline: meta.signatureSubline ?? "",
    footer: meta.footer ?? "",
    intro,
    sections,
    highlight,
    conclusion,
    closingParagraphs,
  };
}

/** Découpe un bloc de texte en paragraphes (séparés par des lignes vides). */
function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

// Chemins littéraux (pas de template) : le traçage des fichiers du build Vercel
// doit pouvoir les détecter pour les embarquer dans la fonction serverless.
const CONTENT_PATHS = {
  fr: path.join(process.cwd(), "src/content/emails/onboarding-welcome.md"),
  en: path.join(process.cwd(), "src/content/emails/onboarding-welcome.en.md"),
} as const;

const cache = new Map<keyof typeof CONTENT_PATHS, OnboardingWelcomeContent>();

/**
 * Lettre dans la langue du destinataire (toute autre langue → français).
 * Lue au premier envoi puis mise en cache : un fichier absent échoue
 * bruyamment, mais seulement pour la lettre de bienvenue, jamais pour le reste
 * du service d'email (qui importe ce module), et sans repli silencieux.
 */
export function getOnboardingWelcomeContent(locale: string): OnboardingWelcomeContent {
  const key = locale === "en" ? "en" : "fr";
  let content = cache.get(key);
  if (!content) {
    content = parse(CONTENT_PATHS[key]);
    cache.set(key, content);
  }
  return content;
}
