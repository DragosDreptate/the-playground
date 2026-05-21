import { getTranslations } from "next-intl/server";
import type { Moment } from "@/domain/models/moment";
import type { Circle } from "@/domain/models/circle";
import type { RegistrationWithUser } from "@/domain/models/registration";
import { formatLongDate, formatLocalizedTime } from "@/lib/format-date";
import { getMomentGradient } from "@/lib/gradient";
import { getPublicUserInitials } from "@/lib/display-name";
import { getAppUrl } from "@/lib/app-url";

type Theme = "light" | "dark";
type SupportedLocale = "fr" | "en";

type Props = {
  moment: Moment;
  circle: Pick<Circle, "slug" | "name">;
  registeredCount: number;
  registeredPreview: RegistrationWithUser[];
  locale: SupportedLocale;
  theme: Theme;
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

  const cardBg = isDark
    ? "bg-slate-900 border-slate-800"
    : "bg-white border-slate-200";
  const titleColor = isDark
    ? isPassive
      ? "text-slate-400"
      : "text-slate-50"
    : isPassive
      ? "text-slate-500"
      : "text-slate-900";
  const titleStrike = isCancelled
    ? "line-through decoration-slate-500 decoration-1"
    : "";
  const dateColor = isDark ? "text-slate-400" : "text-slate-600";
  const iconColor = isDark ? "text-slate-500" : "text-slate-400";
  const proofColor = isDark ? "text-slate-400" : "text-slate-500";
  const dividerRing = isDark ? "ring-slate-900" : "ring-white";
  const footerColor = isDark ? "text-slate-600" : "text-slate-300";
  const footerLink = isDark
    ? "text-slate-500 hover:text-slate-400"
    : "text-slate-400 hover:text-slate-500";

  const coverClass = `h-48 w-48 rounded-xl object-cover ${
    isPast ? "opacity-60 grayscale" : isCancelled ? "opacity-50 grayscale" : ""
  }`;

  return (
    <div
      className={`mx-auto w-full max-w-[480px] rounded-2xl border ${cardBg} p-4 shadow-sm`}
    >
      <div className="flex gap-4">
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
        <div className="flex min-w-0 flex-1 flex-col">
          <h2
            className={`line-clamp-2 text-base font-semibold leading-snug ${titleColor} ${titleStrike}`}
          >
            {moment.title}
          </h2>
          <div className={`mt-4 space-y-2 text-xs ${dateColor}`}>
            <p className="flex items-center gap-2">
              <CalendarIcon className={iconColor} />
              <span>{dateLine}</span>
            </p>
            <p className="flex items-center gap-2">
              <MapPinIcon className={iconColor} />
              <span className="truncate">{locationLine}</span>
            </p>
          </div>
          {isCancelled ? (
            <p className="mt-4 text-xs italic text-red-300/80">
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
              ringClass={dividerRing}
              labelColor={proofColor}
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
            <ArrowRightIcon />
          </a>
        </div>
      </div>
      <p
        className={`mt-3 text-center text-[9px] tracking-wide ${footerColor}`}
      >
        {t("poweredBy")}{" "}
        <a
          href={platformUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`transition-colors ${footerLink}`}
        >
          The Playground
        </a>
      </p>
    </div>
  );
}

function ctaClassName(passive: boolean, dark: boolean): string {
  const base =
    "mt-auto inline-flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-center text-sm font-semibold transition-colors";
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
              className={`relative flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full text-[8px] font-semibold text-white ring-2 ${ringClass} ${avatarFilter}`}
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
      <span className={`text-xs ${labelColor}`}>{label}</span>
    </div>
  );
}

function CalendarIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-3.5 w-3.5 flex-shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function MapPinIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-3.5 w-3.5 flex-shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.244-4.243a8 8 0 1111.314 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 8l4 4m0 0l-4 4m4-4H3"
      />
    </svg>
  );
}
