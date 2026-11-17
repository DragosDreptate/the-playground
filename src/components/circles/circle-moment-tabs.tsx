"use client";

import { useState, type ReactNode } from "react";

type Props = {
  upcomingLabel: string;
  pastLabel: string;
  upcomingContent: ReactNode;
  pastContent: ReactNode;
  /** Action affichée à droite des tabs sur le tab "upcoming" (ex: bouton "Créer un événement") */
  upcomingAction?: ReactNode;
  /** Garde l'action sur la ligne des onglets en mobile (action réduite à une icône). */
  inlineActionOnMobile?: boolean;
  /** Libellés courts affichés sous `sm`, pour faire tenir onglets et action sur une ligne. */
  shortLabels?: { upcoming: string; past: string };
};

function TabLabel({ label, shortLabel }: { label: string; shortLabel?: string }) {
  if (!shortLabel) return label;
  return (
    <>
      <span className="sm:hidden">{shortLabel}</span>
      <span className="hidden sm:inline">{label}</span>
    </>
  );
}

export function CircleMomentTabs({
  upcomingLabel,
  pastLabel,
  upcomingContent,
  pastContent,
  upcomingAction,
  inlineActionOnMobile = false,
  shortLabels,
}: Props) {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  return (
    <div className="space-y-6">
      {/* Tab selector + optional action */}
      <div
        className={
          inlineActionOnMobile
            ? "flex items-center justify-between gap-3 md:gap-4"
            : "flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4"
        }
      >
        <div className="flex items-center gap-1 rounded-full border p-1 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("upcoming")}
            className={`whitespace-nowrap rounded-full px-4 py-1 text-sm font-medium transition-colors ${
              activeTab === "upcoming"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TabLabel label={upcomingLabel} shortLabel={shortLabels?.upcoming} />
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("past")}
            className={`whitespace-nowrap rounded-full px-4 py-1 text-sm font-medium transition-colors ${
              activeTab === "past"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TabLabel label={pastLabel} shortLabel={shortLabels?.past} />
          </button>
        </div>
        {activeTab === "upcoming" && upcomingAction}
      </div>

      {/* Wrappé : sinon le Fragment de la liste devient enfant direct de `space-y-6`,
          qui ajoute 24px entre chaque carte en plus du `pb` de la timeline. */}
      <div>{activeTab === "upcoming" ? upcomingContent : pastContent}</div>
    </div>
  );
}
