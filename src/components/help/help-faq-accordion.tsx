"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface FaqItem {
  question: string;
  answer: string;
}

interface HelpFaqAccordionProps {
  items: FaqItem[];
}

export function HelpFaqAccordion({ items }: HelpFaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <Collapsible key={i} open={isOpen} onOpenChange={(open) => setOpenIndex(open ? i : null)}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-muted data-[state=open]:border-primary/25 data-[state=open]:bg-primary/5">
              <span className={isOpen ? "text-primary" : "text-foreground"}>{item.question}</span>
              <ChevronDown
                className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180 text-primary" : ""}`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden px-4 text-sm text-muted-foreground data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
              <p className="pb-3 pt-2 leading-relaxed">{item.answer}</p>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}
