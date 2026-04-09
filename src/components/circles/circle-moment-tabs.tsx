"use client";

import { useState, type ReactNode } from "react";

type Props = {
  upcomingLabel: string;
  pastLabel: string;
  upcomingContent: ReactNode;
  pastContent: ReactNode;
  /** Action affichée à droite des tabs sur le tab "upcoming" (ex: bouton "Créer un événement") */
  upcomingAction?: ReactNode;
};

export function CircleMomentTabs({
  upcomingLabel,
  pastLabel,
  upcomingContent,
  pastContent,
  upcomingAction,
}: Props) {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  return (
    <div className="space-y-6">
      {/* Tab selector + optional action */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
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
            {upcomingLabel}
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
            {pastLabel}
          </button>
        </div>
        {activeTab === "upcoming" && upcomingAction}
      </div>

      {activeTab === "upcoming" ? upcomingContent : pastContent}
    </div>
  );
}
