"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Ban, ShieldCheck, ShieldX } from "lucide-react";
import {
  auditUserAction,
  blockSignInAction,
  unblockSignInAction,
} from "@/app/actions/audit-user";
import type {
  BlocklistWriteResult,
  BlockTargets,
} from "@/infrastructure/services/audit/blocklist-admin";
import type { BlockMatch } from "@/infrastructure/auth/dynamic-blocklist";
import type {
  AuditReport,
  AuditTargets,
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

// Bouton générique pour une mutation de blocklist (blocage OU déblocage) :
// même mécanique (confirmation + transition + états done/skipped/failed), seuls
// l'action, le ton (destructif vs restauratif) et les libellés changent.
function BlocklistActionButton({
  label,
  confirmTitle,
  confirmDescription,
  confirmLabel,
  doneLabel,
  targets,
  action,
  tone,
  onApplied,
}: {
  label: string;
  confirmTitle: string;
  confirmDescription: string;
  confirmLabel: string;
  doneLabel: string;
  targets: BlockTargets;
  action: (targets: BlockTargets) => Promise<{
    status: BlocklistWriteResult | "unauthorized";
    // Présent pour le blocage : "failed" = compte bloqué MAIS session active non
    // coupée (l'admin doit le savoir, pas de faux « bloqué » silencieux).
    sessionsRevoked?: number | "failed" | null;
  }>;
  tone: "destructive" | "neutral";
  // Appelé après une mutation pleinement réussie, pour que le parent bascule les
  // boutons (bloquer ↔ débloquer) sans attendre un refresh serveur.
  onApplied?: () => void;
}) {
  const t = useTranslations("Admin.audit");
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "done" | "partial" | "skipped" | "failed"
  >("idle");
  const [pending, start] = useTransition();
  const destructive = tone === "destructive";

  const run = () =>
    start(async () => {
      const res = await action(targets);
      setOpen(false);
      if (res.status === "applied") {
        if (res.sessionsRevoked === "failed") {
          // Bloqué mais sessions non coupées : on garde l'avertissement, on ne
          // bascule PAS les boutons (l'admin doit pouvoir réessayer).
          setStatus("partial");
        } else {
          setStatus("done");
          onApplied?.();
        }
      } else if (res.status === "skipped") {
        setStatus("skipped");
      } else {
        setStatus("failed");
      }
    });

  if (status === "done") {
    return (
      <Badge
        className={
          destructive
            ? "bg-red-100 text-red-800 border-transparent"
            : "bg-green-100 text-green-800 border-transparent"
        }
      >
        {destructive ? (
          <ShieldX className="mr-1 size-3" />
        ) : (
          <ShieldCheck className="mr-1 size-3" />
        )}
        {doneLabel}
      </Badge>
    );
  }

  // Blocage appliqué mais coupure de session échouée : le compte est bloqué
  // (plus de reconnexion) mais une session reste active. À signaler clairement.
  if (status === "partial") {
    return (
      <Badge className="bg-amber-100 text-amber-800 border-transparent">
        <ShieldX className="mr-1 size-3" />
        {t("blockedNoRevoke")}
      </Badge>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      {status === "skipped" && (
        <span className="text-xs text-muted-foreground">
          {t("blockSkipped")}
        </span>
      )}
      {status === "failed" && (
        <span className="text-xs text-destructive">
          {destructive ? t("blockFailed") : t("unblockFailed")}
        </span>
      )}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={
              destructive
                ? "border-destructive/40 text-destructive hover:border-destructive hover:bg-destructive/10 hover:text-destructive"
                : undefined
            }
          >
            {destructive ? (
              <Ban className="mr-1.5 size-3.5" />
            ) : (
              <ShieldCheck className="mr-1.5 size-3.5" />
            )}
            {label}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={run}
              disabled={pending}
              className={
                destructive
                  ? "bg-destructive text-white hover:bg-destructive/90"
                  : undefined
              }
            >
              {confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </span>
  );
}

function BlockActions({
  targets,
  reason,
  onReasonChange,
}: {
  targets: AuditTargets;
  reason: BlockMatch | null;
  onReasonChange: (reason: BlockMatch | null) => void;
}) {
  const t = useTranslations("Admin.audit");
  if (!targets.email) return null;

  // Bloqué EN DUR dans le code (sign-in-blocklist.ts) : non débloquable depuis
  // l'UI (ce serait une fausse confirmation). On le signale, sans bouton.
  if (reason === "static") {
    return (
      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        <Badge className="bg-red-100 text-red-800 border-transparent">
          <ShieldX className="mr-1 size-3" />
          {t("staticBlocked")}
        </Badge>
      </div>
    );
  }

  // Bloqué dynamiquement → on propose UNIQUEMENT l'action inverse du canal qui
  // bloque réellement (compte vs domaine), pour ne jamais afficher un faux
  // « Débloqué » sur un canal qui n'était pas concerné.
  if (reason) {
    const isDomain = reason === "domain";
    return (
      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        <Badge className="bg-red-100 text-red-800 border-transparent">
          <ShieldX className="mr-1 size-3" />
          {t("alreadyBlocked")}
        </Badge>
        {isDomain && targets.domain ? (
          <BlocklistActionButton
            label={t("unblockDomain", { domain: targets.domain })}
            confirmTitle={t("confirmUnblockDomainTitle", {
              domain: targets.domain,
            })}
            confirmDescription={t("confirmUnblockDomainDesc", {
              domain: targets.domain,
            })}
            confirmLabel={t("confirmUnblock")}
            doneLabel={t("unblockedDone")}
            targets={{ domains: [targets.domain] }}
            action={unblockSignInAction}
            tone="neutral"
            onApplied={() => onReasonChange(null)}
          />
        ) : (
          <BlocklistActionButton
            label={t("unblockAccount")}
            confirmTitle={t("confirmUnblockAccountTitle")}
            confirmDescription={t("confirmUnblockAccountDesc")}
            confirmLabel={t("confirmUnblock")}
            doneLabel={t("unblockedDone")}
            targets={{ emails: [targets.email], oauthIds: targets.oauthIds }}
            action={unblockSignInAction}
            tone="neutral"
            onApplied={() => onReasonChange(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-t pt-3">
      <BlocklistActionButton
        label={t("blockAccount")}
        confirmTitle={t("confirmAccountTitle")}
        confirmDescription={t("confirmAccountDesc")}
        confirmLabel={t("confirmBlock")}
        doneLabel={t("blockedDone")}
        targets={{ emails: [targets.email], oauthIds: targets.oauthIds }}
        action={blockSignInAction}
        tone="destructive"
        onApplied={() => onReasonChange("email")}
      />
      {targets.domain && (
        <BlocklistActionButton
          label={t("blockDomain", { domain: targets.domain })}
          confirmTitle={t("confirmDomainTitle")}
          confirmDescription={t("confirmDomainDesc", { domain: targets.domain })}
          confirmLabel={t("confirmBlock")}
          doneLabel={t("blockedDone")}
          targets={{ domains: [targets.domain] }}
          action={blockSignInAction}
          tone="destructive"
          onApplied={() => onReasonChange("domain")}
        />
      )}
    </div>
  );
}

export function AdminUserAuditPanel({
  userId,
  email,
  initialTargets,
}: {
  userId: string;
  email: string;
  initialTargets: AuditTargets;
}) {
  const t = useTranslations("Admin.audit");
  const [pending, start] = useTransition();
  const [report, setReport] = useState<AuditReport | null>(null);
  const [targets, setTargets] = useState<AuditTargets | null>(null);
  const [failed, setFailed] = useState(false);
  // Override optimiste du canal de blocage après une action (bloquer/débloquer),
  // pour basculer les boutons immédiatement sans dépendre d'un refresh serveur
  // (l'Edge Config n'est pas cohérente instantanément après écriture).
  // undefined = pas d'override, on suit la valeur serveur.
  const [reasonOverride, setReasonOverride] = useState<
    BlockMatch | null | undefined
  >(undefined);

  const run = () => {
    setFailed(false);
    setReasonOverride(undefined); // un nouvel audit refait foi sur l'état blocklist
    start(async () => {
      const res = await auditUserAction(userId, email);
      if (res.ok) {
        setReport(res.report);
        setTargets(res.targets);
      } else {
        setFailed(true);
        setReport(null);
        setTargets(null);
      }
    });
  };

  const effectiveTargets = targets ?? initialTargets;
  const reason =
    reasonOverride === undefined
      ? effectiveTargets.blockReason
      : reasonOverride;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <Button variant="outline" size="sm" onClick={run} disabled={pending}>
          {pending ? t("running") : report ? t("rerun") : t("run")}
        </Button>
      </CardHeader>
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
        {/* Boutons de blocage TOUJOURS visibles. Après un audit, on prend les
            cibles fraîchement renvoyées ; sinon celles calculées au rendu. Le
            `reason` bascule de façon optimiste après une action. */}
        <BlockActions
          targets={effectiveTargets}
          reason={reason}
          onReasonChange={setReasonOverride}
        />
      </CardContent>
    </Card>
  );
}
