"use client";

import { useTranslations } from "next-intl";
import { Check, X, Minus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

type CellStatus = "check" | "cross" | "partial";

function StatusIcon({ status }: { status: CellStatus }) {
  if (status === "check") {
    return (
      <span className="inline-flex size-6 items-center justify-center rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
        <Check className="size-3.5 stroke-[3]" />
      </span>
    );
  }
  if (status === "cross") {
    return (
      <span className="inline-flex size-6 items-center justify-center rounded-full bg-red-500/10 text-red-500">
        <X className="size-3.5 stroke-[3]" />
      </span>
    );
  }
  return (
    <span className="inline-flex size-6 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
      <Minus className="size-3.5 stroke-[3]" />
    </span>
  );
}

function Cell({ status, label }: { status: CellStatus; label?: string }) {
  return (
    <td className={`px-4 py-3.5 text-center${status === "check" ? " first-col:bg-primary/[0.03]" : ""}`}>
      <div className="flex flex-col items-center gap-1">
        <StatusIcon status={status} />
        {label && (
          <span className="text-muted-foreground text-[11px]">{label}</span>
        )}
      </div>
    </td>
  );
}

function PlaygroundCell({ label }: { label?: string }) {
  return (
    <td className="bg-primary/[0.03] px-4 py-3.5 text-center">
      <div className="flex flex-col items-center gap-1">
        <StatusIcon status="check" />
        {label && (
          <span className="text-muted-foreground text-[11px]">{label}</span>
        )}
      </div>
    </td>
  );
}

export function ComparisonSection({ isLoggedIn }: { isLoggedIn: boolean }) {
  const t = useTranslations("HomePage");

  const rows: {
    label: string;
    playground: string;
    meetup: { status: CellStatus; label?: string };
    luma: { status: CellStatus; label?: string };
    eventbrite: { status: CellStatus; label?: string };
  }[] = [
    {
      label: t("comparisonRowCommunity"),
      playground: t("comparisonPlaygroundCommunity"),
      meetup: { status: "check", label: t("comparisonMeetupCommunity") },
      luma: { status: "cross", label: t("comparisonLumaCommunity") },
      eventbrite: { status: "cross", label: t("comparisonEventbriteCommunity") },
    },
    {
      label: t("comparisonRowFree"),
      playground: t("comparisonPlaygroundFree"),
      meetup: { status: "cross", label: t("comparisonMeetupFree") },
      luma: { status: "partial", label: t("comparisonLumaFree") },
      eventbrite: { status: "partial", label: t("comparisonEventbriteFree") },
    },
    {
      label: t("comparisonRowDesign"),
      playground: t("comparisonPlaygroundDesign"),
      meetup: { status: "cross", label: t("comparisonMeetupDesign") },
      luma: { status: "check", label: t("comparisonLumaDesign") },
      eventbrite: { status: "partial", label: t("comparisonEventbriteDesign") },
    },
    {
      label: t("comparisonRowFriction"),
      playground: t("comparisonPlaygroundFriction"),
      meetup: { status: "cross", label: t("comparisonMeetupFriction") },
      luma: { status: "check" },
      eventbrite: { status: "partial", label: t("comparisonEventbriteFriction") },
    },
    {
      label: t("comparisonRowOwnership"),
      playground: t("comparisonPlaygroundOwnership"),
      meetup: { status: "cross", label: t("comparisonMeetupOwnership") },
      luma: { status: "partial", label: t("comparisonLumaOwnership") },
      eventbrite: { status: "partial", label: t("comparisonEventbriteOwnership") },
    },
    {
      label: t("comparisonRowTicketing"),
      playground: t("comparisonPlaygroundTicketing"),
      meetup: { status: "cross" },
      luma: { status: "check" },
      eventbrite: { status: "check" },
    },
    {
      label: t("comparisonRowWaitlist"),
      playground: t("comparisonPlaygroundWaitlist"),
      meetup: { status: "check" },
      luma: { status: "check" },
      eventbrite: { status: "check" },
    },
  ];

  return (
    <section className="px-4 py-24 md:py-32">
      <div className="mx-auto max-w-[900px]">
        <h2 className="mb-3 text-center text-3xl font-bold tracking-tight md:text-4xl">
          {t("comparisonHeading")}
        </h2>
        <p className="text-muted-foreground mx-auto mb-12 max-w-xl text-center text-base leading-relaxed md:text-lg">
          {t("comparisonSubtitle")}
        </p>

        {/* Table wrapper — scroll horizontal sur mobile */}
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[600px] border-collapse bg-card text-sm">
            <thead>
              <tr>
                <th className="text-muted-foreground w-[200px] px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider" />
                <th className="bg-gradient-to-r from-pink-500 to-violet-500 px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-white">
                  The Playground
                </th>
                <th className="text-muted-foreground px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wider">
                  Meetup
                </th>
                <th className="text-muted-foreground px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wider">
                  Luma
                </th>
                <th className="text-muted-foreground px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wider">
                  Eventbrite
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.label}>
                  <td className="px-4 py-3.5 text-[13px] font-semibold">
                    {row.label}
                  </td>
                  <PlaygroundCell label={row.playground} />
                  <Cell status={row.meetup.status} label={row.meetup.label} />
                  <Cell status={row.luma.status} label={row.luma.label} />
                  <Cell status={row.eventbrite.status} label={row.eventbrite.label} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SEO text */}
        <p className="text-muted-foreground mx-auto mt-10 max-w-2xl text-center text-[15px] leading-relaxed">
          {t.rich("comparisonText", {
            b: (chunks) => (
              <strong className="text-foreground font-semibold">{chunks}</strong>
            ),
          })}
        </p>

        <div className="mt-10 flex justify-center">
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 px-8 py-6 text-base text-white hover:opacity-90"
          >
            <Link href={isLoggedIn ? "/dashboard/circles/new" : "/auth/sign-in"}>
              {t("comparisonCta")}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
