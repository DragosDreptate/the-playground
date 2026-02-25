"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Upload, Plus, Check } from "lucide-react";

type Platform = "ios" | "android" | "other";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/Chrome/.test(ua)) {
    return "ios";
  }
  if (/Android/.test(ua)) {
    return "android";
  }
  return "other";
}

function useInstallState() {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt: () => void } | null>(null);

  useEffect(() => {
    setIsInstalled(window.matchMedia("(display-mode: standalone)").matches);
    setPlatform(detectPlatform());

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as Event & { prompt: () => void });
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  return { platform, isInstalled, deferredPrompt };
}

export function PwaInstallSection() {
  const t = useTranslations("PwaInstall");
  const [iosModalOpen, setIosModalOpen] = useState(false);
  const { platform, isInstalled, deferredPrompt } = useInstallState();

  // Masqué si déjà installé ou si plateforme non supportée (desktop sans prompt)
  if (isInstalled) return null;
  if (platform === null) return null;
  if (platform === "other" && !deferredPrompt) return null;

  function handleAndroidInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
    }
  }

  return (
    <section className="bg-background px-4 py-14 text-center">
      <h2 className="text-foreground mb-2 text-2xl font-bold tracking-tight">
        {t("heading")}
      </h2>
      <p className="text-muted-foreground mb-8 text-sm">
        {t("subtitle")}
      </p>

      <div className="flex justify-center gap-3">
        {/* Badge iOS */}
        {(platform === "ios" || platform === "other") && (
          <button
            onClick={() => setIosModalOpen(true)}
            className="flex min-w-[148px] cursor-pointer items-center gap-2.5 rounded-xl bg-[#0a0a0a] px-4 py-2.5 text-left shadow-lg transition-transform hover:-translate-y-px hover:shadow-xl dark:border dark:border-white/[0.06] dark:bg-[#1a1a1a]"
          >
            <AppleLogo />
            <div className="flex flex-col gap-px">
              <span className="text-[10px] font-normal leading-none text-white/75">
                {t("ios.badgeLine1")}
              </span>
              <span className="text-[15px] font-bold leading-tight tracking-tight text-white">
                {t("ios.badgeLine2")}
              </span>
            </div>
          </button>
        )}

        {/* Badge Android */}
        {(platform === "android" || (platform === "other" && deferredPrompt)) && (
          <button
            onClick={handleAndroidInstall}
            className="flex min-w-[148px] cursor-pointer items-center gap-2.5 rounded-xl bg-[#0a0a0a] px-4 py-2.5 text-left shadow-lg transition-transform hover:-translate-y-px hover:shadow-xl dark:border dark:border-white/[0.06] dark:bg-[#1a1a1a]"
          >
            <GooglePlayLogo />
            <div className="flex flex-col gap-px">
              <span className="text-[10px] font-normal leading-none text-white/75">
                {t("android.badgeLine1")}
              </span>
              <span className="text-[15px] font-bold leading-tight tracking-tight text-white">
                {t("android.badgeLine2")}
              </span>
            </div>
          </button>
        )}
      </div>

      <p className="text-muted-foreground mt-5 flex items-center justify-center gap-1.5 text-[11px]">
        <span className="bg-muted-foreground/40 inline-block size-1 rounded-full" />
        {t("note")}
      </p>

      {/* Modale iOS */}
      <Sheet open={iosModalOpen} onOpenChange={setIosModalOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-0 pb-8">
          <SheetHeader className="px-5 pb-2">
            <SheetTitle className="text-left text-[17px]">
              {t("modal.title")}
            </SheetTitle>
          </SheetHeader>

          <div className="divide-border divide-y px-5">
            <IosStep
              icon={<Upload className="text-primary size-5" strokeWidth={2} />}
              step="1"
              label={t("modal.step1Label")}
              hint={t("modal.step1Hint")}
            />
            <IosStep
              icon={<Plus className="text-primary size-5" strokeWidth={2} />}
              step="2"
              label={t("modal.step2Label")}
              hint={t("modal.step2Hint")}
            />
            <IosStep
              icon={<Check className="text-primary size-5" strokeWidth={2.5} />}
              step="3"
              label={t("modal.step3Label")}
              hint={t("modal.step3Hint")}
            />
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}

function IosStep({
  icon,
  step,
  label,
  hint,
}: {
  icon: React.ReactNode;
  step: string;
  label: string;
  hint: string;
}) {
  return (
    <div className="flex items-start gap-3.5 py-3.5">
      <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-xl">
        {icon}
      </div>
      <div>
        <p className="text-primary mb-0.5 text-[10px] font-bold uppercase tracking-widest">
          Étape {step}
        </p>
        <p className="text-foreground text-sm font-semibold leading-snug">{label}</p>
        <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{hint}</p>
      </div>
    </div>
  );
}

function AppleLogo() {
  return (
    <svg width="20" height="24" viewBox="0 0 814 1000" fill="white" className="shrink-0">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.4 268.8-317.4 64.4 0 117.9 42.5 158.2 42.5 38.4 0 98.9-45.2 170.9-45.2zm-41.4-90.5c31.1-37.9 53.1-90.5 53.1-143.1 0-7.3-.6-14.6-1.9-20.5-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 84.9-55.1 138.2 0 8 1.3 16 1.9 18.6 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-70.3z" />
    </svg>
  );
}

function GooglePlayLogo() {
  return (
    <svg width="22" height="24" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <path d="M3.18 23.76a2 2 0 0 0 2.22-.22L17.12 12 5.4.46A2 2 0 0 0 3.18.7C2.45 1.13 2 1.9 2 2.74v18.52c0 .84.45 1.61 1.18 2z" fill="#EA4335" />
      <path d="M20.82 10.22 18.09 8.7 14.63 12l3.46 3.3 2.73-1.52A2 2 0 0 0 22 12c0-.8-.45-1.55-1.18-1.78z" fill="#FBBC04" />
      <path d="M5.4.46 17.12 12 20.82 8.7c.15-.08.3-.18.42-.29L5.4.46z" fill="#4285F4" />
      <path d="M5.4 23.54l15.84-7.95a2 2 0 0 0-.42-.29L17.12 12 5.4 23.54z" fill="#34A853" />
    </svg>
  );
}
