/**
 * Réécrit uniquement la nouvelle section ajoutée par Release Please dans CHANGELOG.md.
 *
 * Détecte la section en format Release Please (URLs GitHub, ### Bug Fixes, ### Features),
 * la réécrit en langage utilisateur via Claude, et laisse les sections précédentes intactes.
 *
 * Usage : pnpm tsx scripts/humanize-changelog.ts
 * Prérequis : ANTHROPIC_API_KEY dans l'environnement.
 * Contexte : lancé par GitHub Actions sur la PR Release Please.
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import Anthropic from "@anthropic-ai/sdk";

const ROOT = process.cwd();
const CHANGELOG_PATH = resolve(ROOT, "CHANGELOG.md");

/** Extrait toutes les sections de version du changelog. */
function extractVersionSections(changelog: string): Array<{ raw: string; startIndex: number; endIndex: number }> {
  const sections: Array<{ raw: string; startIndex: number; endIndex: number }> = [];
  const regex = /^## \[\d+\.\d+\.\d+\]/gm;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(changelog)) !== null) {
    sections.push({ raw: "", startIndex: match.index, endIndex: -1 });
  }

  for (let i = 0; i < sections.length; i++) {
    const end = i + 1 < sections.length ? sections[i + 1].startIndex : changelog.length;
    sections[i].endIndex = end;
    sections[i].raw = changelog.slice(sections[i].startIndex, end).trimEnd();
  }

  return sections;
}

/** Détecte si une section est au format Release Please (technique). */
function isReleasePleaseFormat(section: string): boolean {
  return (
    // Header avec URL GitHub : ## [1.12.0](https://github.com/...)
    /^## \[\d+\.\d+\.\d+\]\(https:\/\/github\.com\//m.test(section) ||
    // Sections techniques anglaises avec liens de commits
    /^### (Bug Fixes|Features|Miscellaneous Chores|Performance Improvements)/m.test(section)
  );
}

/** Extrait 3 sections humanisées comme exemples few-shot pour Claude. */
function getHumanizedExamples(sections: Array<{ raw: string }>): string {
  return sections
    .filter((s) => !isReleasePleaseFormat(s.raw))
    .slice(0, 3)
    .map((s) => s.raw)
    .join("\n\n---\n\n");
}

/** Appelle Claude pour réécrire la section en langage utilisateur. */
async function rewriteWithClaude(rawSection: string, examples: string): Promise<string> {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Tu es l'équipe produit de The Playground, une plateforme SaaS communautaire (organisation d'événements + gestion de communautés).

## Notre style de changelog

Orienté bénéfices utilisateur, vocabulaire naturel, pas de jargon technique.
- Format du titre : ## [version] — AAAA-MM-JJ — Titre court et évocateur
- Sections : ### Ajouté / ### Amélioré / ### Corrigé (uniquement celles pertinentes)
- Chaque entrée : **Nom de la fonctionnalité** : bénéfice concret pour l'utilisateur
- Pas de liens GitHub, pas de hash de commit, pas de noms de branches
- Français uniquement
- Omettre les entrées purement techniques (refactor, ci, chore, tests, infra) invisibles pour l'utilisateur

## Exemples de notre style (3 dernières versions) :

${examples}

---

## Nouvelle section à réécrire (format Release Please automatique) :

${rawSection}

---

Réécris cette section dans notre style. Réponds uniquement avec le contenu Markdown de la section, sans texte introductif ni commentaire.`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Réponse inattendue de Claude");
  return content.text.trim();
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY manquant dans l'environnement");
  }

  const changelog = readFileSync(CHANGELOG_PATH, "utf-8");
  const sections = extractVersionSections(changelog);

  if (sections.length === 0) {
    console.log("Aucune section de version trouvée dans CHANGELOG.md.");
    return;
  }

  // La première section est la plus récente — c'est celle que Release Please vient d'ajouter
  const newestSection = sections[0];

  if (!isReleasePleaseFormat(newestSection.raw)) {
    console.log("La section la plus récente est déjà au format utilisateur. Rien à faire.");
    return;
  }

  console.log(`Section Release Please détectée :\n${newestSection.raw}\n`);

  const examples = getHumanizedExamples(sections.slice(1));
  if (!examples) {
    throw new Error("Aucun exemple humanisé trouvé dans le changelog pour le few-shot.");
  }

  console.log("Réécriture via Claude...");
  const humanized = await rewriteWithClaude(newestSection.raw, examples);
  console.log(`Section réécrite :\n${humanized}\n`);

  // Remplacement chirurgical : uniquement la nouvelle section, le reste est intact
  const updatedChangelog =
    changelog.slice(0, newestSection.startIndex) +
    humanized +
    "\n\n---\n\n" +
    changelog.slice(newestSection.endIndex).replace(/^\s*---\s*\n/, "");

  writeFileSync(CHANGELOG_PATH, updatedChangelog);
  console.log("CHANGELOG.md mis à jour avec succès (sections précédentes inchangées).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
