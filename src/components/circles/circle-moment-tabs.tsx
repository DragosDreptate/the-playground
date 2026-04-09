"use client";

import { useState, useRef, useLayoutEffect, type ReactNode } from "react";

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
  const scrollPosRef = useRef<number | null>(null);

  const handleTabClick = (tab: "upcoming" | "past") => {
    scrollPosRef.current = window.scrollY;
    setActiveTab(tab);
  };

  useLayoutEffect(() => {
    if (scrollPosRef.current !== null) {
      window.scrollTo({ top: scrollPosRef.current, behavior: "instant" });
      scrollPosRef.current = null;
    }
  }, [activeTab]);

  return (
    <div className="space-y-6">
      {/* Tab selector */}
      <div className="flex items-center gap-1 rounded-full border p-1 w-fit">
        <button
          onClick={() => handleTabClick("upcoming")}
          className={`whitespace-nowrap rounded-full px-4 py-1 text-sm font-medium transition-colors ${
            activeTab === "upcoming"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {upcomingLabel}
        </button>
        <button
          onClick={() => handleTabClick("past")}
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
