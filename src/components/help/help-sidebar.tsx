"use client";

import { useEffect, useRef, useState } from "react";

interface SidebarSection {
  id: string;
  label: string;
  children?: { id: string; label: string }[];
}

interface HelpSidebarProps {
  sections: SidebarSection[];
}

export function HelpSidebar({ sections }: HelpSidebarProps) {
  const [activeId, setActiveId] = useState<string>("");
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const allIds = sections.flatMap((s) => [
      s.id,
      ...(s.children?.map((c) => c.id) ?? []),
    ]);

    const handleIntersect = (entries: IntersectionObserverEntry[]) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setActiveId(entry.target.id);
        }
      }
    };

    observerRef.current = new IntersectionObserver(handleIntersect, {
      rootMargin: "-80px 0px -60% 0px",
      threshold: 0,
    });

    for (const id of allIds) {
      const el = document.getElementById(id);
      if (el) observerRef.current.observe(el);
    }

    return () => observerRef.current?.disconnect();
  }, [sections]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav className="hidden lg:block w-[220px] shrink-0">
      <div className="sticky top-[78px] space-y-1">
        {sections.map((section) => (
          <div key={section.id}>
            <button
              onClick={() => scrollTo(section.id)}
              className={`w-full text-left rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                activeId === section.id
                  ? "bg-primary/8 text-primary"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              {section.label}
            </button>
            {section.children && section.children.length > 0 && (
              <div className="ml-3 mt-0.5 space-y-0.5">
                {section.children.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => scrollTo(child.id)}
                    className={`w-full text-left rounded-md px-3 py-1 text-xs transition-colors ${
                      activeId === child.id
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {child.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}
