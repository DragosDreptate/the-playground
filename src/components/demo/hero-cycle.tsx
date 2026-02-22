"use client";

import { useTranslations } from "next-intl";

export function HeroCycle() {
  const t = useTranslations("HomePage");

  return (
    <h1 className="text-3xl leading-[1.3] font-medium tracking-tighter md:text-4xl lg:text-[2.75rem]">
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
        <CycleSlot
          familiar={t("heroFamiliar1")}
          branded={t("heroBranded1")}
          delay={0}
        />
      </span>
      <span className="block whitespace-nowrap">
        {t("heroHighlight2")}{" "}
        <CycleSlot
          familiar={t("heroFamiliar2")}
          branded={t("heroBranded2")}
          delay={500}
        />
      </span>
    </h1>
  );
}

function CycleSlot({
  familiar,
  branded,
  delay,
}: {
  familiar: string;
  branded: string;
  delay: number;
}) {
  return (
    <span
      className="cycle-slot relative inline-flex overflow-hidden rounded-md bg-primary/10 px-2 align-bottom"
      style={
        {
          "--cycle-delay": `${delay}ms`,
          height: "1.3em",
        } as React.CSSProperties
      }
    >
      <span className="cycle-a block">{familiar}</span>
      <span className="cycle-b absolute inset-x-0 top-full px-2 font-bold">
        <span className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 bg-clip-text text-transparent">
          {branded}
        </span>
      </span>

      <style jsx>{`
        .cycle-a {
          animation: cycle-up 4s ease-in-out var(--cycle-delay) infinite;
        }
        .cycle-b {
          animation: cycle-up-b 4s ease-in-out var(--cycle-delay) infinite;
        }
        @keyframes cycle-up {
          0%,
          40% {
            transform: translateY(0);
            opacity: 1;
          }
          50%,
          90% {
            transform: translateY(-100%);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes cycle-up-b {
          0%,
          40% {
            transform: translateY(0);
            opacity: 0;
          }
          50%,
          90% {
            transform: translateY(-100%);
            opacity: 1;
          }
          100% {
            transform: translateY(0);
            opacity: 0;
          }
        }
      `}</style>
    </span>
  );
}
