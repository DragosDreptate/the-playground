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

function SignalList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="font-medium">{title}</p>
      {items.length ? (
        <ul className="list-disc pl-5 text-muted-foreground">
          {items.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">—</p>
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
        <Button
          variant="outline"
          size="sm"
          onClick={run}
          disabled={pending}
        >
          {pending ? t("running") : report ? t("rerun") : t("run")}
        </Button>
      </CardHeader>
      {(report || failed) && (
        <CardContent className="space-y-3 p-5 pt-0 text-sm">
          {failed && <p className="text-destructive">{t("error")}</p>}
          {report && (
            <>
              <Badge className={VERDICT_CLASS[report.verdictLean]}>
                {t(`verdict.${report.verdictLean}`)}
              </Badge>
              <p>
                <span className="font-medium">{t("identity")} : </span>
                {report.identitySummary}
              </p>
              <p>
                <span className="font-medium">{t("content")} : </span>
                {report.contentSummary || "—"}
              </p>
              <p>
                <span className="font-medium">{t("behavior")} : </span>
                {report.behaviorSummary || "—"}
              </p>
              <SignalList title={t("for")} items={report.signalsFor} />
              <SignalList title={t("against")} items={report.signalsAgainst} />
              <p>
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
