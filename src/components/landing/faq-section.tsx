"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const FAQ_COUNT = 7;

export function FaqSection() {
  const t = useTranslations("HomePage");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const items = Array.from({ length: FAQ_COUNT }, (_, i) => ({
    question: t(`faqQ${i + 1}`),
    answer: t(`faqA${i + 1}`),
  }));

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <section className="px-4 py-24 md:py-32">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="mx-auto max-w-2xl">
        <h2 className="mb-12 text-center text-3xl font-bold tracking-tight md:text-4xl">
          {t("faqHeading")}
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
                    {t.rich(`faqA${i + 1}`, {
                      b: (chunks) => (
                        <strong className="font-semibold text-foreground">
                          {chunks}
                        </strong>
                      ),
                    })}
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
