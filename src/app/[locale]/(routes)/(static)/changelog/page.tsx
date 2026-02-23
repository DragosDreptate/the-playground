import type { Metadata } from "next";
import { getChangelog } from "@/lib/parse-changelog";

export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Changelog · The Playground",
    description: "Les évolutions du Playground, semaine après semaine.",
  };
}

const SECTION_STYLES: Record<
  string,
  { label: string; className: string }
> = {
  Ajouté: { label: "Nouveau", className: "bg-primary/10 text-primary" },
  Added: { label: "New", className: "bg-primary/10 text-primary" },
  Modifié: { label: "Modifié", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  Changed: { label: "Changed", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  Corrigé: { label: "Fix", className: "bg-green-500/10 text-green-600 dark:text-green-400" },
  Fixed: { label: "Fix", className: "bg-green-500/10 text-green-600 dark:text-green-400" },
  Architecture: { label: "Archi", className: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  Tests: { label: "Tests", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  Supprimé: { label: "Supprimé", className: "bg-destructive/10 text-destructive" },
  Removed: { label: "Removed", className: "bg-destructive/10 text-destructive" },
};

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ChangelogPage() {
  const entries = getChangelog();

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">

      {/* Header */}
      <div className="mb-12 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <span className="text-violet-500">✦</span>
          <span>The Playground</span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight">Changelog</h1>
        <p className="text-muted-foreground">
          Les évolutions du Playground, semaine après semaine.
        </p>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* vertical line */}
        <div className="absolute left-0 top-2 bottom-0 w-px bg-border" />

        <div className="space-y-12">
          {entries.map((entry, i) => (
            <div key={entry.version} className="relative pl-8">
              {/* dot */}
              <div
                className={`absolute -left-[4.5px] top-[5px] size-[9px] rounded-full border-2 ${
                  i === 0
                    ? "border-primary bg-primary"
                    : "border-border bg-background"
                }`}
              />

              {/* version meta */}
              <div className="flex items-center gap-3 mb-4">
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                    i === 0
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  v{entry.version}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatDate(entry.date)}
                </span>
              </div>

              {/* optional version title */}
              {entry.title && (
                <h2 className="text-base font-semibold leading-snug mb-4 text-foreground">
                  {entry.title}
                </h2>
              )}

              {/* sections */}
              <div className="space-y-4">
                {entry.sections.map((section) => {
                  const style = SECTION_STYLES[section.title];
                  return (
                    <div key={section.title}>
                      {/* section badge or title */}
                      {style ? (
                        <span
                          className={`mb-2 inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${style.className}`}
                        >
                          {style.label}
                        </span>
                      ) : (
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {section.title}
                        </p>
                      )}

                      <ul className="space-y-1.5">
                        {section.changes.map((change, j) => (
                          <li
                            key={j}
                            className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground"
                          >
                            <span className="mt-2 size-1 shrink-0 rounded-full bg-border" />
                            {change}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
