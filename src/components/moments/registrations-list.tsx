"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Crown, Download, UserMinus } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { Link } from "@/i18n/navigation";
import { getDisplayName } from "@/lib/display-name";
import { RemoveRegistrationDialog } from "@/components/moments/remove-registration-dialog";
import type { RegistrationWithUser } from "@/domain/models/registration";

const PAGE_SIZE = 10;

type RegistrationsListProps = {
  registrations: RegistrationWithUser[];
  registeredCount: number;
  waitlistedCount: number;
  capacity: number | null;
  variant?: "host" | "public";
  hostUserIds?: Set<string>;
  momentSlug?: string;
  isConnected?: boolean;
};

export function RegistrationsList({
  registrations,
  registeredCount,
  waitlistedCount,
  capacity,
  variant = "host",
  hostUserIds = new Set(),
  momentSlug,
  isConnected = false,
}: RegistrationsListProps) {
  const t = useTranslations("Moment");
  const tCommon = useTranslations("Common");
  const tDashboard = useTranslations("Dashboard");

  const [showAll, setShowAll] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);

  function handleExportCsv() {
    const headers = [
      t("registrations.csvHeaders.firstName"),
      t("registrations.csvHeaders.lastName"),
      t("registrations.csvHeaders.email"),
      t("registrations.csvHeaders.status"),
      t("registrations.csvHeaders.registeredAt"),
    ];
    const rows = registrations.map((r) => [
      r.user.firstName ?? "",
      r.user.lastName ?? "",
      r.user.email,
      t(`registrations.status.${r.status.toLowerCase() as "registered" | "waitlisted"}`),
      new Date(r.registeredAt).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `participants-${momentSlug ?? "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  const displayed = showAll ? registrations : registrations.slice(0, PAGE_SIZE);
  const hasMore = registrations.length > PAGE_SIZE;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">{t("registrations.title")}</h2>
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">
              {t("registrations.registered", { count: registeredCount })}
            </Badge>
            {waitlistedCount > 0 && (
              <Badge variant="secondary">
                {t("registrations.waitlisted", { count: waitlistedCount })}
              </Badge>
            )}
            {capacity !== null && (
              <Badge variant="outline">
                {t("registrations.capacity", { count: capacity })}
              </Badge>
            )}
          </div>
        </div>
        {variant === "host" && registrations.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="size-3.5" />
            {t("registrations.exportCsv")}
            <span className="text-muted-foreground font-normal">
              ({registrations.length})
            </span>
          </Button>
        )}
      </div>

      {registrations.length === 0 ? (
        <p className="text-muted-foreground py-4 text-center text-sm">
          {t("registrations.empty")}
        </p>
      ) : (
        <>
          <div className="divide-border divide-y">
            {displayed.map((reg) => {
              const displayName = getDisplayName(
                reg.user.firstName,
                reg.user.lastName,
                reg.user.email
              );
              const isWaitlisted = reg.status === "WAITLISTED";
              const isHost = hostUserIds.has(reg.user.id);
              return (
                <div key={reg.id} className="flex items-center gap-3 py-2.5">
                  <UserAvatar
                    name={displayName}
                    email={reg.user.email}
                    image={reg.user.image}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    {isConnected && reg.user.publicId ? (
                      <Link
                        href={`/u/${reg.user.publicId}`}
                        className="text-sm font-medium leading-snug hover:underline underline-offset-2"
                      >
                        {displayName}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium leading-snug">{displayName}</p>
                    )}
                    {variant === "host" && (
                      <p className="text-muted-foreground truncate text-xs">
                        {reg.user.email}
                      </p>
                    )}
                  </div>
                  {isHost && (
                    <Badge variant="outline" className="border-primary/40 text-primary shrink-0 gap-1">
                      <Crown className="size-3" />
                      {tDashboard("role.host")}
                    </Badge>
                  )}
                  {isWaitlisted && !isHost && (
                    <Badge variant="secondary" className="shrink-0 gap-1">
                      <Clock className="size-3" />
                      {t("registrations.status.waitlisted")}
                    </Badge>
                  )}
                  {variant === "host" && !isHost && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-destructive/40 text-destructive hover:border-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                      onClick={() => setRemoveTarget({ id: reg.id, name: displayName })}
                    >
                      <UserMinus className="size-3.5" />
                      {t("registrations.removeAction")}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {hasMore && !showAll && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowAll(true)}
            >
              {tCommon("showMore")} ({registrations.length - PAGE_SIZE})
            </Button>
          )}
        </>
      )}
      {removeTarget && (
        <RemoveRegistrationDialog
          registrationId={removeTarget.id}
          playerName={removeTarget.name}
          open={!!removeTarget}
          onOpenChange={(open) => { if (!open) setRemoveTarget(null); }}
        />
      )}
    </div>
  );
}
