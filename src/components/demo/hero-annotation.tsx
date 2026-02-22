"use client";

import { useTranslations } from "next-intl";

export function HeroAnnotation() {
  const t = useTranslations("HomePage");

  return (
    <h1 className="text-3xl leading-[1.5] font-medium tracking-tighter md:text-4xl lg:text-[2.75rem]">
      <span className="block whitespace-nowrap">
        <span className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 bg-clip-text font-bold text-transparent">
          {t("heroHighlight1")}
        </span>{" "}
        {t("heroRest1")}
      </span>
      <span className="block whitespace-nowrap">
        <span className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 bg-clip-text font-bold text-transparent">
          {t("heroHighlight2")}
        </span>{" "}
        {t("heroRest2")}
      </span>
      <span className="block whitespace-nowrap">
        <span className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 bg-clip-text font-bold text-transparent">
          {t("heroHighlight3")}
        </span>{" "}
        <AnnotatedTerm
          term={t("heroBranded1")}
          annotation={`= ${t("heroFamiliar1")}`}
        />
      </span>
      <span className="block whitespace-nowrap">
        {t("heroHighlight2")}{" "}
        <AnnotatedTerm
          term={t("heroBranded2")}
          annotation={`= ${t("heroFamiliar2")}`}
        />
      </span>
    </h1>
  );
}

function AnnotatedTerm({
  term,
  annotation,
}: {
  term: string;
  annotation: string;
}) {
  return (
    <span className="relative inline-flex flex-col items-start">
      <span className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 bg-clip-text font-bold text-transparent">
        {term}
      </span>
      <span className="text-muted-foreground absolute -bottom-5 left-0 text-xs font-normal tracking-normal">
        {annotation}
      </span>
    </span>
  );
}
