import type { ReactNode } from "react";

const URL_REGEX = /https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?()]/g;

/**
 * Parse un texte brut et retourne des React nodes où les URLs http/https
 * sont converties en liens <a> cliquables. Le reste reste en texte brut.
 * Sécurisé : pas de dangerouslySetInnerHTML, React échappe tout.
 */
export function linkifyText(text: string): ReactNode[] {
  const result: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  URL_REGEX.lastIndex = 0;

  while ((match = URL_REGEX.exec(text)) !== null) {
    const url = match[0];
    const start = match.index;

    if (start > lastIndex) {
      result.push(text.slice(lastIndex, start));
    }

    result.push(
      <a
        key={start}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 hover:opacity-80 break-all"
      >
        {url}
      </a>
    );

    lastIndex = start + url.length;
  }

  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result;
}
