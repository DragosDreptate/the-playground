import { getTranslations } from "next-intl/server";
import { Calendar, MapPin, ArrowRight } from "lucide-react";
import type { Moment } from "@/domain/models/moment";
import type { Circle } from "@/domain/models/circle";
import type { RegistrationWithUser } from "@/domain/models/registration";
import { formatLongDate, formatLocalizedTime } from "@/lib/format-date";
import { getMomentGradient } from "@/lib/gradient";
import { getPublicUserInitials } from "@/lib/display-name";
import { getAppUrl } from "@/lib/app-url";
import type { EmbedLocale, EmbedTheme } from "@/components/embed/types";

type Props = {
  moment: Moment;
  circle: Pick<Circle, "slug" | "name">;
  registeredCount: number;
  registeredPreview: RegistrationWithUser[];
  locale: EmbedLocale;
  theme: EmbedTheme;
};

export async function EmbedEventCard({
  moment,
  circle,
  registeredCount,
  registeredPreview,
  locale,
  theme,
}: Props) {
  const t = await getTranslations({ locale, namespace: "EmbedWidget" });

  const isDark = theme === "dark";
  const isPast = moment.status === "PAST";
  const isCancelled = moment.status === "CANCELLED";
  const isPassive = isPast || isCancelled;

  const appUrl = getAppUrl();
  const publicMomentUrl = `${appUrl}/${locale}/m/${moment.slug}`;
  const publicCircleUrl = `${appUrl}/${locale}/circles/${circle.slug}`;
  const platformUrl = `${appUrl}?utm_source=embed_widget`;

  const dateLine = `${formatLongDate(moment.startsAt, locale)} · ${formatLocalizedTime(moment.startsAt, locale)}`;
  const locationLine =
    moment.locationType === "ONLINE"
      ? t("online")
      : moment.locationName ?? moment.locationAddress ?? "";

  const ctaHref = isPassive ? publicCircleUrl : publicMomentUrl;
  const ctaLabel = isPassive ? t("viewUpcoming") : t("register");

  const palette = isDark
    ? {
        card: "bg-slate-900 border-slate-800",
        titleActive: "text-slate-50",
        titlePassive: "text-slate-400",
        date: "text-slate-400",
        icon: "text-slate-500",
        proof: "text-slate-400",
        ring: "ring-slate-900",
        footer: "text-slate-600",
        footerLink: "text-slate-500 hover:text-slate-400",
      }
    : {
        card: "bg-white border-slate-200",
        titleActive: "text-slate-900",
        titlePassive: "text-slate-500",
        date: "text-slate-600",
        icon: "text-slate-400",
        proof: "text-slate-500",
        ring: "ring-white",
        footer: "text-slate-300",
        footerLink: "text-slate-400 hover:text-slate-500",
      };
  const titleColor = isPassive ? palette.titlePassive : palette.titleActive;
  const titleStrike = isCancelled
    ? "line-through decoration-slate-500 decoration-1"
    : "";

  const coverOpacity = isPast
    ? "opacity-60 grayscale"
    : isCancelled
      ? "opacity-50 grayscale"
      : "";
  const coverClass = `aspect-square w-full rounded-xl object-cover @[400px]:aspect-auto @[400px]:h-48 @[400px]:w-48 ${coverOpacity}`;

  return (
    <div
      className={`@container mx-auto w-full max-w-[480px] rounded-2xl border ${palette.card} p-4 shadow-sm`}
    >
      <div className="flex flex-col @[400px]:flex-row @[400px]:gap-4">
        <div className="relative flex-shrink-0">
          {moment.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={moment.coverImage} alt="" className={coverClass} />
          ) : (
            <div
              className={coverClass}
              style={{ background: getMomentGradient(moment.slug) }}
            />
          )}
          {isPast && (
            <span className="absolute left-2 top-2 rounded bg-slate-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
              {t("badgePast")}
            </span>
          )}
          {isCancelled && (
            <span className="absolute left-2 top-2 rounded bg-red-900/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-100">
              {t("badgeCancelled")}
            </span>
          )}
        </div>
        <div className="mt-4 flex min-w-0 flex-1 flex-col @[400px]:mt-0">
          <h2
            className={`line-clamp-2 text-lg font-semibold leading-snug @[400px]:text-base ${titleColor} ${titleStrike}`}
          >
            {moment.title}
          </h2>
          <div className={`mt-3 space-y-2 text-sm @[400px]:mt-4 @[400px]:text-xs ${palette.date}`}>
            <p className="flex items-center gap-2">
              <Calendar className={`size-4 shrink-0 @[400px]:size-3.5 ${palette.icon}`} aria-hidden="true" />
              <span>{dateLine}</span>
            </p>
            <p className="flex items-center gap-2">
              <MapPin className={`size-4 shrink-0 @[400px]:size-3.5 ${palette.icon}`} aria-hidden="true" />
              <span className="truncate">{locationLine}</span>
            </p>
          </div>
          {isCancelled ? (
            <p className="mt-4 text-sm italic text-red-300/80 @[400px]:text-xs">
              {t("cancelledExplanation")}
            </p>
          ) : (
            <SocialProof
              attendees={registeredPreview}
              totalCount={registeredCount}
              label={
                isPast
                  ? t("attendedCount", { count: registeredCount })
                  : t("attendingCount", { count: registeredCount })
              }
              ringClass={palette.ring}
              labelColor={palette.proof}
              passive={isPast}
            />
          )}
          <a
            href={ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            className={ctaClassName(isPassive, isDark)}
          >
            <span>{ctaLabel}</span>
            <ArrowRight className="size-4 @[400px]:size-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>
      <p
        className={`mt-4 text-center text-[10px] tracking-wide @[400px]:mt-3 @[400px]:text-[9px] ${palette.footer}`}
      >
        {t("poweredBy")}{" "}
        <a
          href={platformUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`transition-colors ${palette.footerLink}`}
        >
          The Playground
        </a>
      </p>
    </div>
  );
}

function ctaClassName(passive: boolean, dark: boolean): string {
  const base =
    "mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg py-3 text-base font-semibold transition-colors @[400px]:mt-auto @[400px]:py-2.5 @[400px]:text-sm";
  if (!passive) {
    return `${base} bg-primary text-white hover:bg-primary/90`;
  }
  if (dark) {
    return `${base} border border-slate-700 text-slate-300 hover:border-slate-100 hover:bg-slate-100 hover:text-slate-900`;
  }
  return `${base} border border-slate-300 text-slate-700 hover:border-slate-900 hover:bg-slate-900 hover:text-white`;
}

function SocialProof({
  attendees,
  totalCount,
  label,
  ringClass,
  labelColor,
  passive,
}: {
  attendees: RegistrationWithUser[];
  totalCount: number;
  label: string;
  ringClass: string;
  labelColor: string;
  passive: boolean;
}) {
  if (totalCount === 0) return null;
  const visible = attendees.slice(0, 4);
  const stackOpacity = passive ? "opacity-60" : "";
  const avatarFilter = passive ? "grayscale" : "";

  return (
    <div className="mt-4 flex items-center gap-2">
      <div className={`flex -space-x-1.5 ${stackOpacity}`}>
        {visible.map((a, i) => {
          const initials = getPublicUserInitials(a.user);
          const gradient = getMomentGradient(a.user.email);
          return (
            <div
              key={i}
              className={`relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full text-[10px] font-semibold text-white ring-2 @[400px]:h-5 @[400px]:w-5 @[400px]:text-[8px] ${ringClass} ${avatarFilter}`}
              style={{ background: gradient }}
            >
              {a.user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.user.image}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
          );
        })}
      </div>
      <span className={`text-sm @[400px]:text-xs ${labelColor}`}>{label}</span>
    </div>
  );
}
