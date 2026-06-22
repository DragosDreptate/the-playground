"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { auditUserAction } from "@/app/actions/audit-user";
import type {
  AuditReport,
  AuditVerdictLean,
} from "@/infrastructure/services/audit/types";

const VERDICT_CLASS: Record<AuditVerdictLean, string> = {
  likely_legit: "bg-green-100 text-green-800 border-transparent",
  ambiguous: "bg-amber-100 text-amber-800 border-transparent",
  likely_spam: "bg-red-100 text-red-800 border-transparent",
};

function SignalBox({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "danger" | "success";
}) {
  const box =
    tone === "danger"
      ? "border-red-500/40 bg-red-500/10"
      : "border-green-500/40 bg-green-500/10";
  const accent =
    tone === "danger"
      ? "text-red-600 dark:text-red-400"
      : "text-green-700 dark:text-green-400";

  return (
    <div className={`rounded-md border-l-2 ${box} px-3 py-2`}>
      <p className={`font-medium ${accent}`}>{title}</p>
      {items.length ? (
        <ul className="mt-1 space-y-1">
          {items.map((s, i) => (
            <li key={i} className="flex gap-1.5">
              <span className={accent}>•</span>
              <span className="text-muted-foreground">{s}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-muted-foreground">—</p>
      )}
    </div>
  );
}

export function AdminUserAuditPanel({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  const t = useTranslations("Admin.audit");
  const [pending, start] = useTransition();
  const [report, setReport] = useState<AuditReport | null>(null);
  const [failed, setFailed] = useState(false);

  const run = () => {
    setFailed(false);
    start(async () => {
      const res = await auditUserAction(userId, email);
      if (res.ok) setReport(res.report);
      else {
        setFailed(true);
        setReport(null);
      }
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <Button variant="outline" size="sm" onClick={run} disabled={pending}>
          {pending ? t("running") : report ? t("rerun") : t("run")}
        </Button>
      </CardHeader>
      {(report || failed) && (
        <CardContent className="space-y-2.5 p-5 pt-0 text-sm">
          {failed && <p className="text-destructive">{t("error")}</p>}
          {report && (
            <>
              <Badge
                className={`${VERDICT_CLASS[report.verdictLean]} px-3 py-1 text-sm`}
              >
                {t(`verdict.${report.verdictLean}`)}
              </Badge>
              <p className="leading-snug">
                <span className="font-medium">{t("identity")} : </span>
                {report.identitySummary}
              </p>
              <p className="leading-snug">
                <span className="font-medium">{t("content")} : </span>
                {report.contentSummary || "—"}
              </p>
              <p className="leading-snug">
                <span className="font-medium">{t("behavior")} : </span>
                {report.behaviorSummary || "—"}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <SignalBox
                  title={t("for")}
                  items={report.signalsFor}
                  tone="danger"
                />
                <SignalBox
                  title={t("against")}
                  items={report.signalsAgainst}
                  tone="success"
                />
              </div>
              <p className="leading-snug">
                <span className="font-medium">{t("reco")} : </span>
                {report.recommendation}
              </p>
              {report.usage && (
                <p className="text-xs text-muted-foreground">
                  {report.usage.model} · {report.usage.inputTokens}+
                  {report.usage.outputTokens} tok
                </p>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
