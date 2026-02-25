"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Crown } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import type { RegistrationWithUser } from "@/domain/models/registration";

const PAGE_SIZE = 10;

type RegistrationsListProps = {
  registrations: RegistrationWithUser[];
  registeredCount: number;
  waitlistedCount: number;
  capacity: number | null;
  variant?: "host" | "public";
  hostUserIds?: Set<string>;
};

function getDisplayName(firstName: string | null, lastName: string | null, email: string): string {
  if (firstName && lastName) return `${firstName} ${lastName}`;
  if (firstName) return firstName;
  return email;
}

export function RegistrationsList({
  registrations,
  registeredCount,
  waitlistedCount,
  capacity,
  variant = "host",
  hostUserIds = new Set(),
}: RegistrationsListProps) {
  const t = useTranslations("Moment");
  const tCommon = useTranslations("Common");
  const tDashboard = useTranslations("Dashboard");

  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? registrations : registrations.slice(0, PAGE_SIZE);
  const hasMore = registrations.length > PAGE_SIZE;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
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
                    <p className="text-sm font-medium leading-snug">{displayName}</p>
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
    </div>
  );
}
