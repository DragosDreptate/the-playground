"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface FaqItem {
  question: string;
  answerRich: React.ReactNode;
}

export function FaqSection({
  heading,
  items,
}: {
  heading: string;
  items: FaqItem[];
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="bg-muted/60 px-4 py-14 md:py-20">
      <div className="mx-auto max-w-2xl">
        <h2 className="mb-12 text-center text-3xl font-bold tracking-tight md:text-4xl">
          {heading}
        </h2>

        <div className="divide-y">
          {items.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <Collapsible
                key={i}
                open={isOpen}
                onOpenChange={(open) => setOpenIndex(open ? i : null)}
              >
                <CollapsibleTrigger className="flex w-full items-center justify-between py-5 text-left text-base font-semibold transition-colors hover:text-primary">
                  {item.question}
                  <ChevronDown
                    className={`ml-4 size-5 shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
                  <p className="pb-5 text-[15px] leading-relaxed text-muted-foreground">
                    {item.answerRich}
                  </p>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </div>
    </section>
  );
}
