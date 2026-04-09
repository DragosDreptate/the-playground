"use client";

import { useState, type ReactNode } from "react";

type Props = {
  upcomingLabel: string;
  pastLabel: string;
  upcomingContent: ReactNode;
  pastContent: ReactNode;
  defaultTab?: "upcoming" | "past";
};

export function CircleMomentTabs({
  upcomingLabel,
  pastLabel,
  upcomingContent,
  pastContent,
  defaultTab = "upcoming",
}: Props) {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">(defaultTab);

  return (
    <div className="space-y-6">
      {/* Tab selector */}
      <div className="flex items-center gap-1 rounded-full border p-1 w-fit">
        <button
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

      {activeTab === "upcoming" ? upcomingContent : pastContent}
    </div>
  );
}
