"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type Phase = "typing" | "pause" | "erasing" | "retyping" | "done";

function useTypewriter(familiar: string, branded: string, delayMs: number) {
  const [text, setText] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const [phase, setPhase] = useState<Phase>("typing");

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    let idx = 0;

    function typeForward(word: string, cb: () => void) {
      if (idx <= word.length) {
        setText(word.slice(0, idx));
        idx++;
        timeout = setTimeout(() => typeForward(word, cb), 60);
      } else {
        cb();
      }
    }

    function eraseBack(word: string, cb: () => void) {
      if (idx >= 0) {
        setText(word.slice(0, idx));
        idx--;
        timeout = setTimeout(() => eraseBack(word, cb), 40);
      } else {
        cb();
      }
    }

    // Initial delay before starting
    timeout = setTimeout(() => {
      // Phase 1: type familiar
      idx = 0;
      setPhase("typing");
      typeForward(familiar, () => {
        // Phase 2: pause
        setPhase("pause");
        timeout = setTimeout(() => {
          // Phase 3: erase
          idx = familiar.length;
          setPhase("erasing");
          eraseBack(familiar, () => {
            // Phase 4: retype branded
            idx = 0;
            setPhase("retyping");
            typeForward(branded, () => {
              setPhase("done");
              // Hide cursor after a short delay
              timeout = setTimeout(() => setShowCursor(false), 1000);
            });
          });
        }, 1500);
      });
    }, delayMs);

    return () => clearTimeout(timeout);
  }, [familiar, branded, delayMs]);

  return { text, showCursor, phase };
}

export function HeroTypewriter() {
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
        <TypewriterSlot
          familiar={t("heroFamiliar1")}
          branded={t("heroBranded1")}
          delay={500}
        />
      </span>
      <span className="block whitespace-nowrap">
        {t("heroHighlight2")}{" "}
        <TypewriterSlot
          familiar={t("heroFamiliar2")}
          branded={t("heroBranded2")}
          delay={4500}
        />
      </span>
    </h1>
  );
}

function TypewriterSlot({
  familiar,
  branded,
  delay,
}: {
  familiar: string;
  branded: string;
  delay: number;
}) {
  const { text, showCursor, phase } = useTypewriter(familiar, branded, delay);
  const isBranded = phase === "retyping" || phase === "done";

  return (
    <span className="inline-flex items-baseline">
      <span
        className={
          isBranded
            ? "bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 bg-clip-text font-bold text-transparent"
            : ""
        }
      >
        {text}
      </span>
      {showCursor && (
        <span className="typewriter-cursor ml-px inline-block h-[1.1em] w-[2px] translate-y-[0.1em] bg-current" />
      )}
      <style jsx>{`
        .typewriter-cursor {
          animation: blink 0.6s step-end infinite;
        }
        @keyframes blink {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
        }
      `}</style>
    </span>
  );
}
