"use client";

import { useTranslations } from "next-intl";

/**
 * Hero word-swap (fade vertical, boucle infinie, toujours bas→haut).
 *
 * Ligne 1 : Lancez votre [communauté. ↔ Cercle.]
 * Ligne 2 : Organisez vos [événements. ↔ Escales.]
 * Ligne 3 : Fédérez votre audience. (statique)
 */
export function HeroWordSwap() {
  const t = useTranslations("HomePage");

  return (
    <h1 className="text-3xl leading-[1.3] font-medium tracking-tighter md:text-4xl lg:text-[2.75rem]">
      <span className="block whitespace-nowrap">
        <span className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 bg-clip-text font-bold text-transparent">
          {t("heroHighlight1")}
        </span>{" "}
        {t("heroRestPrefix1")}{" "}
        <SwapSlot
          familiar={`${t("heroFamiliar1")}.`}
          branded={`${t("heroBranded1")}.`}
          delay={0}
        />
      </span>

      <span className="block whitespace-nowrap">
        <span className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 bg-clip-text font-bold text-transparent">
          {t("heroHighlight2")}
        </span>{" "}
        {t("heroRestPrefix2")}{" "}
        <SwapSlot
          familiar={`${t("heroFamiliar2")}.`}
          branded={`${t("heroBranded2")}.`}
          delay={400}
        />
      </span>

      <span className="block whitespace-nowrap">
        <span className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 bg-clip-text font-bold text-transparent">
          {t("heroHighlight3")}
        </span>{" "}
        {t("heroRest3")}
      </span>
    </h1>
  );
}

/**
 * Slot animé : les deux mots alternent en boucle, toujours du bas vers le haut.
 *
 * Cycle 8s :
 *   0-35%   familier visible
 *   35-42%  familier sort par le haut, branded entre par le bas
 *   42-85%  branded visible
 *   85-92%  branded sort par le haut, familier entre par le bas
 *   92-100% familier visible (raccord avec le 0% du cycle suivant)
 */
function SwapSlot({
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
      className="swap-slot relative inline-flex overflow-hidden align-bottom"
      style={
        {
          "--swap-delay": `${500 + delay}ms`,
          height: "1.3em",
        } as React.CSSProperties
      }
    >
      <span className="swap-familiar block">{familiar}</span>

      <span className="swap-branded absolute inset-x-0 font-bold" style={{ top: "100%" }}>
        <span className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 bg-clip-text text-transparent">
          {branded}
        </span>
      </span>

      <style jsx>{`
        .swap-familiar {
          animation: swap-fam 8s ease-in-out var(--swap-delay) infinite;
        }
        .swap-branded {
          animation: swap-brand 8s ease-in-out var(--swap-delay) infinite;
        }

        /* Familier : visible → sort haut → teleport bas → entre bas → visible */
        @keyframes swap-fam {
          0%,
          35% {
            transform: translateY(0);
            opacity: 1;
          }
          42% {
            transform: translateY(-110%);
            opacity: 0;
          }
          42.1% {
            transform: translateY(110%);
            opacity: 0;
          }
          85% {
            transform: translateY(110%);
            opacity: 0;
          }
          92% {
            transform: translateY(0);
            opacity: 1;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }

        /* Branded : en bas → entre bas → visible → sort haut → teleport bas */
        @keyframes swap-brand {
          0%,
          35% {
            transform: translateY(0);
            opacity: 0;
          }
          42% {
            transform: translateY(-100%);
            opacity: 1;
          }
          85% {
            transform: translateY(-100%);
            opacity: 1;
          }
          92% {
            transform: translateY(-210%);
            opacity: 0;
          }
          92.1% {
            transform: translateY(0);
            opacity: 0;
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
