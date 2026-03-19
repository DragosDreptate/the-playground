"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Check, X } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { getDisplayName } from "@/lib/display-name";
import {
  approveCircleMembershipAction,
  rejectCircleMembershipAction,
} from "@/app/actions/circle";
import {
  approveMomentRegistrationAction,
  rejectMomentRegistrationAction,
} from "@/app/actions/registration";
import type { CircleMemberWithUser } from "@/domain/models/circle";
import type { RegistrationWithUser } from "@/domain/models/registration";

type PendingMembershipsListProps = {
  circleId: string;
  pendingMemberships: CircleMemberWithUser[];
};

export function PendingMembershipsList({
  circleId,
  pendingMemberships,
}: PendingMembershipsListProps) {
  const t = useTranslations("Dashboard");
  const router = useRouter();
  const [processed, setProcessed] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  if (pendingMemberships.length === 0) return null;

  const visible = pendingMemberships.filter((m) => !processed.has(m.userId));
  if (visible.length === 0) return null;

  function handleAction(memberUserId: string, action: "approve" | "reject") {
    startTransition(async () => {
      const result = action === "approve"
        ? await approveCircleMembershipAction(circleId, memberUserId)
        : await rejectCircleMembershipAction(circleId, memberUserId);
      if (result.success) {
        setProcessed((prev) => new Set(prev).add(memberUserId));
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">{t("pendingRequests.membershipsTitle")}</h2>
        <Badge variant="secondary" className="gap-1">
          <Clock className="size-3" />
          {visible.length}
        </Badge>
      </div>
      <div className="divide-border divide-y">
        {visible.map((membership) => {
          const displayName = getDisplayName(
            membership.user.firstName,
            membership.user.lastName,
            membership.user.email
          );
          return (
            <div key={membership.userId} className="flex items-center gap-3 py-2.5">
              <UserAvatar
                name={displayName}
                email={membership.user.email}
                image={membership.user.image}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug">{displayName}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {membership.user.email}
                </p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleAction(membership.userId, "approve")}
                  className="gap-1"
                >
                  <Check className="size-3.5" />
                  {t("pendingRequests.approve")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleAction(membership.userId, "reject")}
                  className="border-destructive/40 text-destructive hover:border-destructive hover:bg-destructive/10 hover:text-destructive gap-1"
                >
                  <X className="size-3.5" />
                  {t("pendingRequests.reject")}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type PendingRegistrationsListProps = {
  pendingRegistrations: RegistrationWithUser[];
};

export function PendingRegistrationsList({
  pendingRegistrations,
}: PendingRegistrationsListProps) {
  const t = useTranslations("Dashboard");
  const router = useRouter();
  const [processed, setProcessed] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  if (pendingRegistrations.length === 0) return null;

  const visible = pendingRegistrations.filter((r) => !processed.has(r.id));
  if (visible.length === 0) return null;

  function handleAction(registrationId: string, action: "approve" | "reject") {
    startTransition(async () => {
      const result = action === "approve"
        ? await approveMomentRegistrationAction(registrationId)
        : await rejectMomentRegistrationAction(registrationId);
      if (result.success) {
        setProcessed((prev) => new Set(prev).add(registrationId));
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">{t("pendingRequests.registrationsTitle")}</h2>
        <Badge variant="secondary" className="gap-1">
          <Clock className="size-3" />
          {visible.length}
        </Badge>
      </div>
      <div className="divide-border divide-y">
        {visible.map((reg) => {
          const displayName = getDisplayName(
            reg.user.firstName,
            reg.user.lastName,
            reg.user.email
          );
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
                <p className="text-muted-foreground truncate text-xs">
                  {reg.user.email}
                </p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleAction(reg.id, "approve")}
                  className="gap-1"
                >
                  <Check className="size-3.5" />
                  {t("pendingRequests.approve")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleAction(reg.id, "reject")}
                  className="border-destructive/40 text-destructive hover:border-destructive hover:bg-destructive/10 hover:text-destructive gap-1"
                >
                  <X className="size-3.5" />
                  {t("pendingRequests.reject")}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
